import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"
import { aplicarRisco } from "@/lib/calcularRisco"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Buscar configuração de mensagens da clínica
    const configResult = await pool.query(
      `SELECT cm."diasEntreTentativa2", cm."diasEntreTentativa3"
       FROM "ConfiguracaoMensagens" cm
       INNER JOIN "Usuario" u ON u."clinicaId" = cm."clinicaId"
       WHERE u.email = $1`,
      [session.user.email]
    )
    const diasEntre2 = parseInt(configResult.rows[0]?.diasEntreTentativa2 ?? 3)
    const diasEntre3 = parseInt(configResult.rows[0]?.diasEntreTentativa3 ?? 5)

    const result = await pool.query(
      `SELECT p.* FROM "Paciente" p
       INNER JOIN "Clinica" c ON c.id = p."clinicaId"
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )

    const clinicaResult = await pool.query(
      `SELECT c."ticketMedio" FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const ticketMedio = parseFloat(clinicaResult.rows[0]?.ticketMedio) || 0

    const hoje = new Date()

    const fila = aplicarRisco(result.rows)
      .filter((p) => p.nivelRisco !== "ok")
      .filter((p) => {
        const raw = result.rows.find((r: any) => r.id == p.id)
        const tentativa = parseInt(raw?.tentativaAtual ?? 0)
        const ultimaTentativa = raw?.ultimaTentativa ? new Date(raw.ultimaTentativa) : null

        // Nunca contatado — sempre aparece
        if (tentativa === 0) return true

        // Esgotou tentativas — não aparece
        if (tentativa >= 3) return false

        // Ainda dentro do prazo de espera — não aparece
        if (!ultimaTentativa) return false
        const diasPassados = Math.floor((hoje.getTime() - ultimaTentativa.getTime()) / (1000 * 60 * 60 * 24))

        if (tentativa === 1) return diasPassados >= diasEntre2
        if (tentativa === 2) return diasPassados >= diasEntre3

        return false
      })
      .map((p) => {
        const raw = result.rows.find((r: any) => r.id == p.id)
        const tentativa = parseInt(raw?.tentativaAtual ?? 0)
        const ultimaTentativa = raw?.ultimaTentativa ? new Date(raw.ultimaTentativa) : null
        const diasPassados = ultimaTentativa
          ? Math.floor((hoje.getTime() - ultimaTentativa.getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          ...p,
          valorTicket: p.valorTicket > 0 ? p.valorTicket : ticketMedio,
          tentativaAtual: tentativa,
          proximaTentativa: tentativa + 1,
          diasSemResposta: diasPassados,
        }
      })

    return Response.json(fila)
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao buscar fila" }, { status: 500 })
  }
}