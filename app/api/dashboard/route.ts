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
    const periodo = searchParams.get("periodo") || "30"

    // Mapear período para intervalo SQL
    const intervaloMap: Record<string, string> = {
      "7": "7 days",
      "30": "30 days",
      "90": "90 days",
    }
    const intervalo = intervaloMap[periodo] || "30 days"
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
    const criticos = comRisco.filter((p) => p.nivelRisco === "critico")
    const recuperados = todos.filter((p) => p.status === "recuperado").length

    // Receita em risco: soma dos tickets dos pacientes em risco
    const receitaEmRisco = comRisco
      .filter((p) => p.nivelRisco !== "ok")
      .reduce((acc, p) => acc + p.valorTicket, 0)

    // Buscar ticket médio da clínica (configurado no onboarding)
    const clinicaResult = await pool.query(
      `SELECT c."ticketMedio" FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const ticketMedio = parseFloat(clinicaResult.rows[0]?.ticketMedio) || 0

    // Para pacientes sem valorUltimaConsulta definido, usar o ticket médio da clínica como fallback
    const receitaEmRiscoComFallback = comRisco
      .filter((p) => p.nivelRisco !== "ok")
      .reduce((acc, p) => acc + (p.valorTicket > 0 ? p.valorTicket : ticketMedio), 0)

    // Top 5 urgentes para a tabela do dashboard (críticos com mais dias)
    const urgentes = criticos.slice(0, 5).map((p) => ({
      id: p.id,
      nome: p.nome,
      diasSemConsulta: p.diasSemConsulta,
      nivelRisco: p.nivelRisco,
      valorTicket: p.valorTicket > 0 ? p.valorTicket : ticketMedio,
    }))

    // Dados para o gráfico de evolução (filtrado por período)
    const grafico = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', p."ultimaConsulta"), 'Mon/YY') as month,
         COUNT(*) FILTER (WHERE p.status = 'em_risco' OR p.status = 'contatado' OR p.status = 'aguardando_resposta') as emRisco,
         COUNT(*) FILTER (WHERE p.status = 'recuperado') as recuperados
       FROM "Paciente" p
       INNER JOIN "Clinica" c ON c.id = p."clinicaId"
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1
         AND p."ultimaConsulta" >= NOW() - INTERVAL '${intervalo}'
       GROUP BY DATE_TRUNC('month', p."ultimaConsulta")
       ORDER BY DATE_TRUNC('month', p."ultimaConsulta") ASC`,
      [session.user.email]
    )

    return Response.json({
      cards: {
        totalPacientes,
        emRisco,
        recuperados,
        receitaEmRisco: receitaEmRiscoComFallback,
      },
      urgentes,
      grafico: grafico.rows,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao buscar dados do dashboard" }, { status: 500 })
  }
}
