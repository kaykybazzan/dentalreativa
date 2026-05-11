import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { pacienteId, valorRecuperado } = await req.json()

    // Buscar clinicaId
    const clinicaResult = await pool.query(
      `SELECT c.id FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const clinicaId = clinicaResult.rows[0]?.id

    // Atualizar status do paciente para recuperado
    await pool.query(
      `UPDATE "Paciente" SET status = 'recuperado' WHERE id = $1`,
      [pacienteId]
    )

    // Atualizar o último ContactAttempt com resultado recuperado e valor
    await pool.query(
      `UPDATE "ContactAttempt" 
       SET tipo = 'recuperado', "valorRecuperado" = $1
       WHERE "pacienteId" = $2 AND "clinicaId" = $3
       AND id = (
         SELECT id FROM "ContactAttempt"
         WHERE "pacienteId" = $2 AND "clinicaId" = $3
         ORDER BY "criadoEm" DESC
         LIMIT 1
       )`,
      [valorRecuperado || 0, pacienteId, clinicaId]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao marcar como recuperado" }, { status: 500 })
  }
}
