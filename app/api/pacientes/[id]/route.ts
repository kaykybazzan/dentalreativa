import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { telefone, ultimaConsulta } = await req.json()
    const telefoneLimpo = telefone?.replace(/\D/g, "") ?? ""

    await pool.query(
      `UPDATE "Paciente" SET telefone = $1, "ultimaConsulta" = $2,
       "dadosIncompletos" = CASE WHEN $1 != '' AND $2 IS NOT NULL THEN false ELSE "dadosIncompletos" END
       WHERE id = $3`,
      [telefoneLimpo, ultimaConsulta, params.id]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error)
    return Response.json({ error: "Erro ao atualizar paciente" }, { status: 500 })
  }
}
