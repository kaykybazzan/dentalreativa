import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";
import { aplicarRisco } from "@/lib/calcularRisco";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
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
    const totalEmContato = todos.filter((p) => p.status === "em_contato").length;
    const totalRecuperados = todos.filter((p) => p.status === "recuperado").length;
    const totalSemResposta = todos.filter((p) => p.status === "sem_resposta").length;
    const totalIncompletos = todos.filter((p) => p.dadosIncompletos).length;

    // ── RECEITA RECUPERADA ───────────────────────────────────
    // Soma real dos valores dos ContactAttempts com resultado = recuperado
    const receitaRecuperadaResult = await pool.query(
      `SELECT COALESCE(SUM(ca.valor_recuperado), 0) as total
       FROM "ContactAttempt" ca
       WHERE ca."clinicaId" = $1 AND ca.resultado = 'recuperado'`,
      [clinicaId]
    );
    const receitaRecuperada = parseFloat(receitaRecuperadaResult.rows[0]?.total) || 0;

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
    const taxaSucesso = totalContatadosNum > 0
      ? ((totalRecuperados / totalContatadosNum) * 100).toFixed(1)
      : "0.0";

    // ── EVOLUÇÃO MENSAL ──────────────────────────────────────
    // Quantos pacientes foram recuperados por mês nos últimos 6 meses
    const evolucaoMensal = await pool.query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('month', ca."criadoEm"), 'Mon/YY') as mes,
         DATE_TRUNC('month', ca."criadoEm") as mes_ordem,
         COUNT(*) FILTER (WHERE ca.resultado = 'recuperado') as recuperados,
         COUNT(*) as total_envios
       FROM "ContactAttempt" ca
       WHERE ca."clinicaId" = $1
         AND ca."criadoEm" >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', ca."criadoEm")
       ORDER BY DATE_TRUNC('month', ca."criadoEm") ASC`,
      [clinicaId]
    );

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
         SUM(ca.valor_recuperado) as valor_total,
         MAX(ca."criadoEm") as data_recuperacao,
         COUNT(ca.id) as tentativas_necessarias
       FROM "Paciente" p
       INNER JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
       WHERE p."clinicaId" = $1 AND p.status = 'recuperado'
       GROUP BY p.id, p.nome, p.telefone, p."ultimaConsulta"
       ORDER BY MAX(ca."criadoEm") DESC`,
      [clinicaId]
    );

    // ── PERFORMANCE DAS MENSAGENS POR TENTATIVA ────────────────
    const performanceMensagens = await pool.query(
      `SELECT 
         ca."tentativaNumero",
         COUNT(*) as total_envios,
         COUNT(*) FILTER (WHERE ca.resultado = 'recuperado') as total_recuperados
       FROM "ContactAttempt" ca
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
      },
      funil: {
        emRisco: comRisco.length,
        contatados: totalContatadosNum,
        recuperados: totalRecuperados,
        enviosPorTentativa: enviosPorTentativa.rows,
      },
      evolucaoMensal: evolucaoMensal.rows,
      pacientesEmRisco,
      recuperados: recuperadosResult.rows,
      performanceMensagens: performance,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Erro ao buscar relatórios" }, { status: 500 });
  }
}
