import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const userRes = await pool.query(
      `SELECT "clinicaId" FROM "Usuario" WHERE email = $1`,
      [session.user.email]
    )
    if (userRes.rows.length === 0) {
      return Response.json({ error: "Usuário não encontrado" }, { status: 404 })
    }
    const clinicaId = userRes.rows[0].clinicaId

    type Notificacao =
  | { id: string; tipo: "resumo"; titulo: string; emRisco: number; aguardandoContato: number; receitaRecuperavel: number }
  | { id: string; tipo: "critico"; pacienteId: number; pacienteNome: string; dias: number; valor: number }
  | { id: string; tipo: "critico_mais"; total: number; restantes: number }
  | { id: string; tipo: "followup"; pacienteId: number; pacienteNome: string; tentativa: number; diasSemResposta: number }
  | { id: string; tipo: "followup_mais"; total: number; restantes: number }
  | { id: string; tipo: "recuperado"; pacienteId: number; pacienteNome: string; valor: number; diasRecuperado: number }
  | { id: string; tipo: "recuperado_mais"; total: number; restantes: number }

  const notificacoes: Notificacao[] = []

    // Buscar configuração de risco e mensagens da clínica
    const configRes = await pool.query(
      `SELECT "diasRiscoMedio", "diasRiscoAlto", "diasRiscoCritico",
              "diasEntreTentativa2", "diasEntreTentativa3"
       FROM "ConfiguracaoMensagens"
       WHERE "clinicaId" = $1`,
      [clinicaId]
    )
    const diasRiscoCritico = parseInt(configRes.rows[0]?.diasRiscoCritico ?? 365)
    const diasRiscoMedio = parseInt(configRes.rows[0]?.diasRiscoMedio ?? 180)
    const diasFollowup = parseInt(configRes.rows[0]?.diasEntreTentativa2 ?? 3)

    // 1. RESUMO DO DIA
    const resumoRes = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE
          "ultimaConsulta" IS NOT NULL AND
          DATE_PART('day', NOW() - "ultimaConsulta") >= $2 AND
          status::text NOT IN ('recuperado', 'nao_contatar')
        ) AS em_risco,
        COUNT(*) FILTER (WHERE
          status::text = 'ativo' AND
          "ultimaConsulta" IS NOT NULL AND
          DATE_PART('day', NOW() - "ultimaConsulta") >= $2 AND
          "tentativaAtual" = 0
        ) AS aguardando_contato,
        COALESCE(SUM(
          CASE WHEN "ultimaConsulta" IS NOT NULL AND
            DATE_PART('day', NOW() - "ultimaConsulta") >= $2 AND
            status::text NOT IN ('recuperado', 'nao_contatar')
          THEN "valorUltimaConsulta" ELSE 0 END
        ), 0) AS receita_recuperavel
      FROM "Paciente"
      WHERE "clinicaId" = $1`,
      [clinicaId, diasRiscoMedio]
    )

    const resumo = resumoRes.rows[0]
    notificacoes.push({
      id: "resumo",
      tipo: "resumo",
      titulo: "Resumo do dia",
      emRisco: parseInt(resumo.em_risco),
      aguardandoContato: parseInt(resumo.aguardando_contato),
      receitaRecuperavel: parseFloat(resumo.receita_recuperavel),
    })

    // 2. TOTAL de críticos (para o "+ X outros")
    const totalCriticosRes = await pool.query(
      `SELECT COUNT(*) as total FROM "Paciente"
      WHERE "clinicaId" = $1
        AND "ultimaConsulta" IS NOT NULL
        AND DATE_PART('day', NOW() - "ultimaConsulta") >= $2
        AND status::text NOT IN ('recuperado', 'nao_contatar')
        AND "tentativaAtual" = 0`,
      [clinicaId, diasRiscoCritico]
    )
    const totalCriticos = parseInt(totalCriticosRes.rows[0].total)

    // 3. TOP 3 críticos
    const criticosRes = await pool.query(
      `SELECT id, nome, "valorUltimaConsulta",
        DATE_PART('day', NOW() - "ultimaConsulta")::int AS dias
      FROM "Paciente"
      WHERE "clinicaId" = $1
        AND "ultimaConsulta" IS NOT NULL
        AND DATE_PART('day', NOW() - "ultimaConsulta") >= $2
        AND status::text NOT IN ('recuperado', 'nao_contatar')
        AND "tentativaAtual" = 0
      ORDER BY "ultimaConsulta" ASC 
      LIMIT 3`,
      [clinicaId, diasRiscoCritico]
    )

    criticosRes.rows.forEach((p) => {
      notificacoes.push({
        id: `critico-${p.id}`,
        tipo: "critico",
        pacienteId: p.id,
        pacienteNome: p.nome,
        dias: p.dias,
        valor: parseFloat(p.valorUltimaConsulta || 0),
      })
    })

    if (totalCriticos > 3) {
      notificacoes.push({
        id: "critico-mais",
        tipo: "critico_mais",
        total: totalCriticos,
        restantes: totalCriticos - 3,
      })
    }

    // 4. FOLLOW-UP
    const totalFollowupRes = await pool.query(
      `SELECT COUNT(*) as total
      FROM "Paciente" p
      INNER JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
      WHERE p."clinicaId" = $1
        AND p.status::text NOT IN ('recuperado', 'nao_contatar')
        AND p."tentativaAtual" < 3
      GROUP BY p.id
      HAVING DATE_PART('day', NOW() - MAX(ca."criadoEm")) >= $2`,
      [clinicaId, diasFollowup]
    )
    const totalFollowup = totalFollowupRes.rows.length

    const followupRes = await pool.query(
      `SELECT p.id, p.nome, p."tentativaAtual",
        DATE_PART('day', NOW() - MAX(ca."criadoEm"))::int AS dias_desde_envio
      FROM "Paciente" p
      INNER JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
      WHERE p."clinicaId" = $1
        AND p.status::text NOT IN ('recuperado', 'nao_contatar')
        AND p."tentativaAtual" < 3
      GROUP BY p.id, p.nome, p."tentativaAtual"
      HAVING DATE_PART('day', NOW() - MAX(ca."criadoEm")) >= $2
      ORDER BY dias_desde_envio DESC
      LIMIT 3`,
      [clinicaId, diasFollowup]
    )

    followupRes.rows.forEach((p) => {
      notificacoes.push({
        id: `followup-${p.id}`,
        tipo: "followup",
        pacienteId: p.id,
        pacienteNome: p.nome,
        tentativa: parseInt(p.tentativaAtual || 1),
        diasSemResposta: p.dias_desde_envio,
      })
    })

    if (totalFollowup > 3) {
      notificacoes.push({
        id: "followup-mais",
        tipo: "followup_mais",
        total: totalFollowup,
        restantes: totalFollowup - 3,
      })
    }

    // 5. TOTAL de recuperados recentes
    const totalRecuperadosRes = await pool.query(
      `SELECT COUNT(*) as total FROM "Paciente"
      WHERE "clinicaId" = $1
        AND status::text = 'recuperado'
        AND "atualizadoEm" >= NOW() - INTERVAL '7 days'`,
      [clinicaId]
    )
    const totalRecuperados = parseInt(totalRecuperadosRes.rows[0].total)

    // 6. TOP 3 recuperados
    const recuperadosRes = await pool.query(
      `SELECT p.id, p.nome, p."valorUltimaConsulta",
        DATE_PART('day', NOW() - "atualizadoEm")::int AS dias_recuperado
      FROM "Paciente" p
      WHERE p."clinicaId" = $1
        AND p.status::text = 'recuperado'
        AND p."atualizadoEm" >= NOW() - INTERVAL '7 days'
      ORDER BY p."atualizadoEm" DESC
      LIMIT 3`,
      [clinicaId]
    )

    recuperadosRes.rows.forEach((p) => {
      notificacoes.push({
        id: `recuperado-${p.id}`,
        tipo: "recuperado",
        pacienteId: p.id,
        pacienteNome: p.nome,
        valor: parseFloat(p.valorUltimaConsulta || 0),
        diasRecuperado: p.dias_recuperado,
      })
    })

    if (totalRecuperados > 3) {
      notificacoes.push({
        id: "recuperado-mais",
        tipo: "recuperado_mais",
        total: totalRecuperados,
        restantes: totalRecuperados - 3,
      })
    }

    const badgeCount = totalCriticos + totalFollowup

    return Response.json({ notificacoes, badgeCount })
  } catch (error) {
    console.error("Erro ao buscar notificações:", error)
    return Response.json({ error: "Erro interno" }, { status: 500 })
  }
}