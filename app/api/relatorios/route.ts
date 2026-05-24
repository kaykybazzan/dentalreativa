import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";
import { aplicarRisco } from "@/lib/calcularRisco";

function gerarMesesPeriodo(periodo: string, dataInicio: string | null, dataFim: string | null) {
  const meses = []
  const hoje = new Date()
  let inicio: Date

  if (periodo === "7d") inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
  else if (periodo === "90d") inicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)
  else if (periodo === "custom" && dataInicio) inicio = new Date(dataInicio)
  else inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000) // 30d default

  const atual = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  while (atual <= fim) {
    const nomeMes = atual.toLocaleString('en-US', { month: 'short' })
    const ano = String(atual.getFullYear()).slice(2)
    meses.push({
      label: `${nomeMes}/${ano}`,
    })
    atual.setMonth(atual.getMonth() + 1)
  }
  return meses
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get("periodo") || "30d"
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")

    // Mapear período para intervalo SQL
    const intervaloMap: Record<string, string> = {
      "7d": "7 days",
      "30d": "30 days",
      "90d": "90 days",
    }

    // Se for período custom com datas específicas, usar as datas
    let filtroPeriodo = ""
    if (periodo === "custom" && dataInicio && dataFim) {
      filtroPeriodo = `AND ca."criadoEm" >= '${dataInicio}' AND ca."criadoEm" <= '${dataFim}'`
    } else {
      const intervalo = intervaloMap[periodo] || "30 days"
      filtroPeriodo = `AND ca."criadoEm" >= NOW() - INTERVAL '${intervalo}'`
    }

    // Buscar ticket médio da clínica para fallback
    const clinicaResult = await pool.query(
      `SELECT c.id, c."ticketMedio" FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    );
    const clinicaId = clinicaResult.rows[0]?.id;
    const ticketMedio = parseFloat(clinicaResult.rows[0]?.ticketMedio) || 0;

    // Buscar todos os pacientes da clínica
    const pacientesResult = await pool.query(
      `SELECT * FROM "Paciente" WHERE "clinicaId" = $1`,
      [clinicaId]
    );
    const todos = pacientesResult.rows;

    // ── MÉTRICAS GERAIS ──────────────────────────────────────

    const totalPacientes = todos.length;
    const totalAtivos = todos.filter((p) => p.status === "ativo").length;
    const totalEmContato = todos.filter((p) => p.status === "contatado").length;
    const totalRecuperados = todos.filter((p) => p.status === "recuperado").length;
    const totalSemResposta = todos.filter((p) => p.status === "aguardando_resposta").length;
    const totalIncompletos = todos.filter((p) => p.dadosIncompletos).length;

    // ── RECEITA RECUPERADA ───────────────────────────────────
    // Soma real dos valores dos ContactAttempts com valorRecuperado > 0
    const receitaRecuperadaResult = await pool.query(
      `SELECT COALESCE(SUM(ca."valorRecuperado"), 0) as total
       FROM "ContactAttempt" ca
       WHERE ca."clinicaId" = $1 AND ca."valorRecuperado" > 0`,
      [clinicaId]
    );
    const receitaRecuperadaBruta = parseFloat(receitaRecuperadaResult.rows[0]?.total) || 0;

    // ── RECEITA EM RISCO ─────────────────────────────────────
    // Soma dos tickets dos pacientes em risco (180+ dias)
    // Usar ticket_medio como fallback se paciente não tiver valor definido
    const comRisco = aplicarRisco(todos).filter((p) => p.nivelRisco !== "ok");
    const receitaEmRisco = comRisco.reduce(
      (acc, p) => acc + (p.valorTicket > 0 ? p.valorTicket : ticketMedio),
      0
    );

    // ── FUNIL DE REATIVAÇÃO ──────────────────────────────────
    // Quantos foram contatados, quantos responderam, quantos recuperados
    const totalContatados = await pool.query(
      `SELECT COUNT(DISTINCT "pacienteId") as total
       FROM "ContactAttempt"
       WHERE "clinicaId" = $1`,
      [clinicaId]
    );

    const totalEnvios = await pool.query(
      `SELECT COUNT(*) as total
       FROM "ContactAttempt"
       WHERE "clinicaId" = $1`,
      [clinicaId]
    );

    const enviosPorTentativa = await pool.query(
      `SELECT "tentativaNumero", COUNT(*) as total
       FROM "ContactAttempt"
       WHERE "clinicaId" = $1
       GROUP BY "tentativaNumero"
       ORDER BY "tentativaNumero" ASC`,
      [clinicaId]
    );

    // Taxa de sucesso: recuperados / total contatados
    const totalContatadosNum = parseInt(totalContatados.rows[0]?.total) || 0;

    const recuperadosComContato = await pool.query(
      `SELECT COUNT(DISTINCT p.id) as total
       FROM "Paciente" p
       INNER JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
       WHERE p."clinicaId" = $1 AND p.status::text = 'recuperado'`,
      [clinicaId]
    );
    const recuperadosComContatoNum = parseInt(recuperadosComContato.rows[0]?.total) || 0;

    const recuperadosViaContato = parseInt(recuperadosComContato.rows[0]?.total) || 0;
    const receitaRecuperada = receitaRecuperadaBruta > 0
      ? receitaRecuperadaBruta
      : recuperadosViaContato * ticketMedio;
    const taxaSucesso = totalContatadosNum > 0
      ? ((recuperadosViaContato / totalContatadosNum) * 100).toFixed(1)
      : "0.0";

    // ── EVOLUÇÃO MENSAL ──────────────────────────────────────
    // Quantos pacientes foram recuperados por mês no período selecionado
    const evolucaoMensal = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', ca."criadoEm"), 'Mon/YY') as mes,
         DATE_TRUNC('month', ca."criadoEm") as mes_ordem,
         COUNT(*) FILTER (WHERE p.status::text = 'recuperado') as recuperados,
         COUNT(*) as total_envios
       FROM "ContactAttempt" ca
       INNER JOIN "Paciente" p ON p.id = ca."pacienteId"
       WHERE ca."clinicaId" = $1
         ${filtroPeriodo}
       GROUP BY DATE_TRUNC('month', ca."criadoEm")
       ORDER BY DATE_TRUNC('month', ca."criadoEm") ASC`,
      [clinicaId]
    );

    // Gerar todos os meses do período com zero como fallback
    const mesesCompletos = gerarMesesPeriodo(periodo, dataInicio, dataFim)
    const evolucaoComZeros = mesesCompletos.map(mes => {
      const encontrado = evolucaoMensal.rows.find((r: any) => r.mes === mes.label)
      return {
        mes: mes.label,
        total_envios: encontrado ? parseInt(encontrado.total_envios) : 0,
        recuperados: encontrado ? parseInt(encontrado.recuperados) : 0,
      }
    })

    // ── PACIENTES EM RISCO DETALHADO ─────────────────────────
    // Lista dos pacientes em risco para exibir na tabela do relatório
    const pacientesEmRisco = comRisco.map((p) => ({
      id: p.id,
      nome: p.nome,
      telefone: p.telefone,
      diasSemConsulta: p.diasSemConsulta,
      nivelRisco: p.nivelRisco,
      valorTicket: p.valorTicket > 0 ? p.valorTicket : ticketMedio,
      status: p.status,
    }));

    // ── PACIENTES RECUPERADOS DETALHADO ──────────────────────
    const recuperadosResult = await pool.query(
      `SELECT 
         p.id, p.nome, p.telefone, p."ultimaConsulta",
         SUM(ca."valorRecuperado") as valor_total,
         MAX(ca."criadoEm") as data_recuperacao,
         COUNT(ca.id) as tentativas_necessarias
       FROM "Paciente" p
       INNER JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
       WHERE p."clinicaId" = $1 AND p.status::text = 'recuperado'
       GROUP BY p.id, p.nome, p.telefone, p."ultimaConsulta"
       ORDER BY MAX(ca."criadoEm") DESC`,
      [clinicaId]
    );

    // ── PERFORMANCE DAS MENSAGENS POR TENTATIVA ────────────────
    const performanceMensagens = await pool.query(
      `SELECT 
         ca."tentativaNumero",
         COUNT(*) as total_envios,
         COUNT(*) FILTER (WHERE p.status::text = 'recuperado') as total_recuperados
       FROM "ContactAttempt" ca
       INNER JOIN "Paciente" p ON p.id = ca."pacienteId"
       WHERE ca."clinicaId" = $1
       GROUP BY ca."tentativaNumero"
       ORDER BY ca."tentativaNumero" ASC`,
      [clinicaId]
    );

    // Calcular taxa de sucesso por tentativa
    const performance = [1, 2, 3].map((num) => {
      const tentativa = performanceMensagens.rows.find(
        (r: any) => parseInt(r.tentativaNumero) === num
      );
      const totalEnvios = parseInt(tentativa?.total_envios) || 0;
      const totalRecuperados = parseInt(tentativa?.total_recuperados) || 0;
      const taxaSucesso = totalEnvios > 0
        ? ((totalRecuperados / totalEnvios) * 100).toFixed(1)
        : null; // null = sem dados ainda

      return {
        tentativa: num,
        totalEnvios,
        totalRecuperados,
        taxaSucesso, // null quando não há dados
      };
    });

    // TEMPO MÉDIO ATÉ RECUPERAÇÃO 
    const tempoMedioResult = await pool.query(
      `SELECT
         AVG(
           DATE_PART('day', p."atualizadoEm" - primeiro_contato."criadoEm")
         )::int AS dias_medio
       FROM "Paciente" p
       INNER JOIN (
         SELECT "pacienteId", MIN("criadoEm") as "criadoEm"
         FROM "ContactAttempt"
         WHERE "clinicaId" = $1
         GROUP BY "pacienteId"
       ) primeiro_contato ON primeiro_contato."pacienteId" = p.id
       WHERE p."clinicaId" = $1
         AND p.status::text = 'recuperado'`,
      [clinicaId]
    )
    const tempoMedioRetorno = parseInt(tempoMedioResult.rows[0]?.dias_medio) || 0

    // Funil histórico: total de pacientes que já passaram pelo processo
    const totalPassaramPeloRisco = comRisco.length

    return Response.json({
      metricas: {
        totalPacientes,
        totalAtivos,
        totalEmContato,
        totalRecuperados,
        totalSemResposta,
        totalIncompletos,
        receitaRecuperada,
        receitaEmRisco,
        taxaSucesso,
        totalEnvios: parseInt(totalEnvios.rows[0]?.total) || 0,
        totalContatados: totalContatadosNum,
        tempoMedioRetorno,
      },
      funil: {
        emRisco: totalPassaramPeloRisco,
        contatados: totalContatadosNum,
        recuperados: recuperadosViaContato,
        enviosPorTentativa: enviosPorTentativa.rows,
      },
      evolucaoMensal: evolucaoComZeros,
      pacientesEmRisco,
      recuperados: recuperadosResult.rows,
      performanceMensagens: performance,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Erro ao buscar relatórios" }, { status: 500 });
  }
}
