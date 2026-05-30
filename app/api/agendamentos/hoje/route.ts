import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const clinicaResult = await pool.query(
      `SELECT c.id FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const clinicaId = clinicaResult.rows[0]?.id
    if (!clinicaId) return Response.json({ count: 0 })

    const result = await pool.query(
      `SELECT COUNT(*) as total FROM "Agendamento"
       WHERE "clinicaId" = $1
       AND "dataConsulta" = CURRENT_DATE
       AND status::text IN ('agendado', 'confirmado')`,
      [clinicaId]
    )

    return Response.json({ count: parseInt(result.rows[0].total) })
  } catch (error) {
    console.error(error)
    return Response.json({ count: 0 })
  }
}