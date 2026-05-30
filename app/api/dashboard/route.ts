import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"
import { aplicarRisco } from "@/lib/calcularRisco"

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

    // Calcular intervalo e agrupamento baseado no período
    let intervaloSQL: string
    let agrupamento: string // 'month' ou 'quarter'

    if (periodo === "custom" && dataInicio && dataFim) {
      // Converter YYYY-MM-DD para Date para calcular diferença
      const from = new Date(dataInicio + "T00:00:00")
      const to = new Date(dataFim + "T00:00:00")
      const diffDias = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDias <= 14) {
        agrupamento = "day"
      } else if (diffDias <= 60) {
        agrupamento = "week"
      } else {
        agrupamento = "month"
      }
      intervaloSQL = "" // não usa intervalo, usa datas direto
    } else {
      const intervaloMap: Record<string, string> = {
        "6m": "6 months",
        "1a": "12 months",
        "2a": "24 months",
      }
      intervaloSQL = intervaloMap[periodo] || "6 months"
      agrupamento = "month"
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
    const comRisco = aplicarRisco(todos)

    // Métricas para os cards do dashboard
    const totalPacientes = todos.length
    const emRisco = comRisco.filter((p) => p.nivelRisco !== "ok").length
    const recuperados = todos.filter((p) => p.status === "recuperado").length
    const aguardandoResposta = todos.filter((p) => p.status === "aguardando_resposta").length

    // Receita em risco: soma dos tickets dos pacientes em risco
    const receitaEmRisco = comRisco
      .filter((p) => p.nivelRisco !== "ok")
      .reduce((acc, p) => acc + p.valorTicket, 0)

    // Buscar ticket médio da clínica (configurado no onboarding)
    const clinicaResult = await pool.query(
      `SELECT c.id, c."ticketMedio" FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const clinicaId = clinicaResult.rows[0]?.id
    const ticketMedio = parseFloat(clinicaResult.rows[0]?.ticketMedio) || 0

    // Recuperados via contato (pacientes que passaram pela Central de Envios)
    const recuperadosViaContato = await pool.query(
      `SELECT COUNT(DISTINCT p.id) as total
       FROM "Paciente" p
       INNER JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
       WHERE p."clinicaId" = $1 AND p.status::text = 'recuperado'`,
      [clinicaId]
    )
    const totalRecuperadosViaContato = parseInt(recuperadosViaContato.rows[0]?.total) || 0

    // Para pacientes sem valorUltimaConsulta definido, usar o ticket médio da clínica como fallback
    const receitaEmRiscoComFallback = comRisco
      .filter((p) => p.nivelRisco !== "ok")
      .reduce((acc, p) => acc + (p.valorTicket > 0 ? p.valorTicket : ticketMedio), 0)

    // Top 5 urgentes para a tabela do dashboard (críticos com mais dias)
    const urgentes = comRisco
      .filter((p) => p.nivelRisco !== "ok")
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

      const emRiscoPorPeriodo = emRiscoResult.rows.reduce((acc: any, row: any) => {
        const label = formatLabel(new Date(row.periodo))
        acc[label] = parseInt(row.total) || 0
        return acc
      }, {})

      const recuperadosPorPeriodo = recuperadosResult.rows.reduce((acc: any, row: any) => {
        const label = formatLabel(new Date(row.periodo))
        acc[label] = parseInt(row.total) || 0
        return acc
      }, {})

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

      // Query 1 — pacientes em risco por mês
      const emRiscoResult = await pool.query(
        `SELECT
          TO_CHAR(DATE_TRUNC('month', p."ultimaConsulta" + INTERVAL '180 days'), 'Mon/YY') as month,
          COUNT(*) as total
        FROM "Paciente" p
        WHERE p."clinicaId" = $1
        AND p."ultimaConsulta" IS NOT NULL
        AND p."status" != 'recuperado'
        GROUP BY DATE_TRUNC('month', p."ultimaConsulta" + INTERVAL '180 days')
        ORDER BY DATE_TRUNC('month', p."ultimaConsulta" + INTERVAL '180 days') ASC`,
        [clinicaId]
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
      const emRiscoPorMes = emRiscoResult.rows.reduce((acc: any, row: any) => {
        acc[row.month] = parseInt(row.total) || 0
        return acc
      }, {})

      const recuperadosPorMes = recuperadosResult.rows.reduce((acc: any, row: any) => {
        acc[row.month] = parseInt(row.total) || 0
        return acc
      }, {})

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
