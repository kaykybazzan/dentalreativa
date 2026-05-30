import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.nome, c.telefone, c.cidade, c."ticketMedio"
       FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    return Response.json(result.rows[0] ?? {})
  } catch (error) {
    console.error("Erro ao buscar clínica:", error)
    return Response.json({ error: "Erro ao buscar clínica" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { nome, telefone, cidade, ticketMedio } = await req.json()

    await pool.query(
      `UPDATE "Clinica" c
       SET nome = $1, telefone = $2, cidade = $3, "ticketMedio" = $4
       FROM "Usuario" u
       WHERE u."clinicaId" = c.id AND u.email = $5`,
      [nome, telefone, cidade, ticketMedio ? parseFloat(String(ticketMedio)) : null, session.user.email]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar clínica:", error)
    return Response.json({ error: "Erro ao salvar clínica" }, { status: 500 })
  }
}