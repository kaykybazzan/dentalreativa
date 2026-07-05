import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"
import { aplicarRisco } from "@/lib/calcularRisco"

function rowsParaMapaDeContagem(
  rows: { total: string }[],
  getLabel: (row: any) => string
): Record<string, number> {
  return rows.reduce((acc: Record<string, number>, row) => {
    acc[getLabel(row)] = parseInt(row.total) || 0
    return acc
  }, {})
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get("periodo") || "6m"
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")

    if (periodo === "custom" && dataInicio && dataFim) {
}
    // Buscar todos os pacientes da clínica
    const result = await pool.query(
      `SELECT p.* FROM "Paciente" p
      INNER JOIN "Clinica" c ON c.id = p."clinicaId"
      INNER JOIN "Usuario" u ON u."clinicaId" = c.id
      WHERE u.email = $1`,
      [session.user.email]
    )

    const todos = result.rows

    // Buscar ticket médio e clinicaId da clínica
    const clinicaResult = await pool.query(
      `SELECT c.id, c."ticketMedio" FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const clinicaId = clinicaResult.rows[0]?.id
    const ticketMedio = parseFloat(clinicaResult.rows[0]?.ticketMedio) || 0

    // Buscar configuração de risco da clínica
    const configRiscoResult = await pool.query(
      `SELECT cm."diasRiscoMedio", cm."diasRiscoAlto", cm."diasRiscoCritico"
       FROM "ConfiguracaoMensagens" cm
       INNER JOIN "Usuario" u ON u."clinicaId" = cm."clinicaId"
       WHERE u.email = $1`,
      [session.user.email]
    )
    const configRisco = {
      diasRiscoMedio: parseInt(String(configRiscoResult.rows[0]?.diasRiscoMedio ?? "180"), 10),
      diasRiscoAlto: parseInt(String(configRiscoResult.rows[0]?.diasRiscoAlto ?? "270"), 10),
      diasRiscoCritico: parseInt(String(configRiscoResult.rows[0]?.diasRiscoCritico ?? "365"), 10),
    }

    const comRisco = aplicarRisco(todos, configRisco)

    // Métricas para os cards do dashboard
    const totalPacientes = todos.length
    const emRisco = comRisco.filter((p) => p.nivelRisco !== "ok" && p.status !== "aguardando_resposta").length
    const recuperados = todos.filter((p) => p.status === "recuperado").length
    const aguardandoResposta = todos.filter((p) => p.status === "aguardando_resposta").length

    // receitaEmRisco calculada abaixo com fallback do ticketMedio

    // Recuperados via contato (pacientes que passaram pela Central de Envios)
    const contatadosMesResult = await pool.query(
      `SELECT COUNT(DISTINCT "pacienteId") as total
       FROM "ContactAttempt"
       WHERE "clinicaId" = $1
         AND tipo IN ('enviado', 'recuperado')
         AND "tentativaNumero" >= 1
         AND "criadoEm" >= DATE_TRUNC('month', NOW())`,
      [clinicaId]
    )
    const totalRecuperadosViaContato = parseInt(contatadosMesResult.rows[0]?.total) || 0

    // Para pacientes sem valorUltimaConsulta definido, usar o ticket médio da clínica como fallback
    const receitaEmRiscoComFallback = comRisco
      .filter((p) => p.nivelRisco !== "ok" && p.status !== "aguardando_resposta")
      .reduce((acc, p) => acc + (p.valorTicket > 0 ? p.valorTicket : ticketMedio), 0)

    const urgentes = comRisco
      .filter((p) => p.nivelRisco !== "ok" && p.status !== "aguardando_resposta") 
      .sort((a, b) => b.diasSemConsulta - a.diasSemConsulta)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        diasSemConsulta: p.diasSemConsulta,
        nivelRisco: p.nivelRisco,
        valorTicket: p.valorTicket > 0 ? p.valorTicket : ticketMedio,
      }))

    // Gerar períodos do gráfico
    let graficoFormatado: { month: string; emRisco: number; recuperados: number }[]

    if (periodo === "custom" && dataInicio && dataFim) {
      // Lógica para período customizado com agrupamento dinâmico
      const from = new Date(dataInicio + "T00:00:00")
      const to = new Date(dataFim + "T00:00:00")
      const diffDias = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

      let dateTrunc: string
      let periodos: { month: string; emRisco: number; recuperados: number }[] = []

      if (diffDias <= 14) {
        // Agrupar por DIA
        dateTrunc = "day"
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
          periodos.push({ month: label, emRisco: 0, recuperados: 0 })
        }
      } else if (diffDias <= 60) {
        // Agrupar por SEMANA
        dateTrunc = "week"
        const current = new Date(from)
        current.setDate(current.getDate() - current.getDay()) // Domingo da semana
        while (current <= to) {
          const label = "Sem " + current.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
          periodos.push({ month: label, emRisco: 0, recuperados: 0 })
          current.setDate(current.getDate() + 7)
        }
      } else {
        // Agrupar por MÊS
        dateTrunc = "month"
        const current = new Date(from.getFullYear(), from.getMonth(), 1)
        const endMonth = new Date(to.getFullYear(), to.getMonth(), 1)
        while (current <= endMonth) {
          const label = current.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
            .replace(/^\w/, (c) => c.toUpperCase())
          periodos.push({ month: label, emRisco: 0, recuperados: 0 })
          current.setMonth(current.getMonth() + 1)
        }
      }

      // Query 1 — pacientes em risco por período
      const emRiscoResult = await pool.query(
        `SELECT
          DATE_TRUNC($1, p."ultimaConsulta") AS periodo,
          COUNT(*) AS total
        FROM "Paciente" p
        WHERE p."clinicaId" = $2
          AND p."ultimaConsulta" >= $3::date
          AND p."ultimaConsulta" <= $4::date
          AND p.status::text NOT IN ('recuperado', 'nao_contatar')
        GROUP BY 1
        ORDER BY 1`,
        [dateTrunc, clinicaId, dataInicio, dataFim]
      )

      // Query 2 — pacientes recuperados por período
      const recuperadosResult = await pool.query(
        `SELECT
          DATE_TRUNC($1, ca."criadoEm") AS periodo,
          COUNT(*) AS total
        FROM "ContactAttempt" ca
        WHERE ca."clinicaId" = $2
          AND ca.tipo = 'recuperado'
          AND ca."criadoEm" >= $3::date
          AND ca."criadoEm" <= $4::date
        GROUP BY 1
        ORDER BY 1`,
        [dateTrunc, clinicaId, dataInicio, dataFim]
      )

      // Formatar labels dos resultados
      const formatLabel = (date: Date) => {
        if (diffDias <= 14) {
          return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        } else if (diffDias <= 60) {
          return "Sem " + date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        } else {
          return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
            .replace(/^\w/, (c) => c.toUpperCase())
        }
      }

      interface ContagemPorPeriodo {
        periodo: string
        total: string
      }

      const emRiscoPorPeriodo = rowsParaMapaDeContagem(emRiscoResult.rows, (row) => formatLabel(new Date(row.periodo)))

      const recuperadosPorPeriodo = rowsParaMapaDeContagem(recuperadosResult.rows, (row) => formatLabel(new Date(row.periodo)))

      graficoFormatado = periodos.map((p) => ({
        month: p.month,
        emRisco: emRiscoPorPeriodo[p.month] ?? 0,
        recuperados: recuperadosPorPeriodo[p.month] ?? 0,
      }))
    } else {
      // Lógica original para 6m, 1a, 2a
      const hoje = new Date()
      const mesesPeriodo: { month: string; emRisco: number; recuperados: number }[] = []

      const numMeses = periodo === "6m" ? 6 : periodo === "1a" ? 12 : 24

      for (let i = numMeses - 1; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        const label = data
          .toLocaleString("en-US", { month: "short", year: "2-digit" })
          .replace(" ", "/")
        mesesPeriodo.push({ month: label, emRisco: 0, recuperados: 0 })
      }

      // Query 1 — pacientes em risco por mês (usa diasRiscoMedio da configuração)
      const emRiscoResult = await pool.query(
        `SELECT
          TO_CHAR(DATE_TRUNC('month', p."ultimaConsulta" + ($2 || ' days')::INTERVAL), 'Mon/YY') as month,
          COUNT(*) as total
        FROM "Paciente" p
        WHERE p."clinicaId" = $1
        AND p."ultimaConsulta" IS NOT NULL
        AND p."status" != 'recuperado'
        GROUP BY DATE_TRUNC('month', p."ultimaConsulta" + ($2 || ' days')::INTERVAL)
        ORDER BY DATE_TRUNC('month', p."ultimaConsulta" + ($2 || ' days')::INTERVAL) ASC`,
        [clinicaId, configRisco.diasRiscoMedio]
      )

      // Query 2 — pacientes recuperados por mês
      const recuperadosResult = await pool.query(
        `SELECT
          TO_CHAR(DATE_TRUNC('month', ca."criadoEm"), 'Mon/YY') as month,
          COUNT(*) as total
        FROM "ContactAttempt" ca
        WHERE ca."clinicaId" = $1
        AND ca.tipo = 'recuperado'
        AND ca."criadoEm" IS NOT NULL
        GROUP BY DATE_TRUNC('month', ca."criadoEm")
        ORDER BY DATE_TRUNC('month', ca."criadoEm") ASC`,
        [clinicaId]
      )

      // Montar graficoFormatado preenchendo zeros
      const emRiscoPorMes = rowsParaMapaDeContagem(emRiscoResult.rows, (row) => row.month)

      const recuperadosPorMes = rowsParaMapaDeContagem(recuperadosResult.rows, (row) => row.month)

      graficoFormatado = mesesPeriodo.map((mes) => ({
        month: mes.month,
        emRisco: emRiscoPorMes[mes.month] ?? 0,
        recuperados: recuperadosPorMes[mes.month] ?? 0,
      }))
    }

    // Notificações reais
    const notificacoesResult = await pool.query(
      `SELECT 
        'risco' as tipo,
        p.nome as texto,
        p."criadoEm" as data
      FROM "Paciente" p
      WHERE p."clinicaId" = $1
        AND p."criadoEm" >= NOW() - INTERVAL '24 hours'
        AND p.status = 'ativo'
      UNION ALL
      SELECT
        'recuperado' as tipo,
        p.nome as texto,
        ca."criadoEm" as data
      FROM "ContactAttempt" ca
      INNER JOIN "Paciente" p ON p.id = ca."pacienteId"
      WHERE ca."clinicaId" = $1
        AND ca."criadoEm" >= NOW() - INTERVAL '7 days'
        AND ca.tipo = 'recuperado'
      ORDER BY data DESC
      LIMIT 5`,
      [clinicaId]
    )

    const notificacoes = notificacoesResult.rows.map((n: any) => {
      const agora = new Date()
      const data = new Date(n.data)
      const diffHoras = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60))
      const tempo = diffHoras < 1 ? "Agora mesmo" : diffHoras < 24 ? `Há ${diffHoras}h` : `Há ${Math.floor(diffHoras / 24)} dias`

      return {
        tipo: n.tipo,
        texto: n.tipo === "risco"
          ? `${n.texto} entrou na fila de risco`
          : `${n.texto} voltou à clínica`,
        tempo,
      }
    })

    return Response.json({
      cards: {
        totalPacientes,
        emRisco,
        recuperados,
        recuperadosViaContato: totalRecuperadosViaContato,
        aguardandoResposta,
        receitaEmRisco: receitaEmRiscoComFallback,
      },
      urgentes,
      grafico: graficoFormatado,
      notificacoes,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao buscar dados do dashboard" }, { status: 500 })
  }
}
