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
    const result = await pool.query(
      `SELECT p.* FROM "Paciente" p
       INNER JOIN "Clinica" c ON c.id = p."clinicaId"
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )

    // Buscar ticket médio para fallback
    const clinicaResult = await pool.query(
      `SELECT c."ticketMedio" FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const ticketMedio = parseFloat(clinicaResult.rows[0]?.ticketMedio) || 0

    // Aplicar risco e filtrar apenas os que precisam de contato (medio, alto, critico)
    const fila = aplicarRisco(result.rows)
      .filter((p) => p.nivelRisco !== "ok" && p.status !== "recuperado" && p.status !== "nao_contatar")
      .map((p) => ({
        ...p,
        // Fallback de valor: se paciente não tem ticket definido, usa o da clínica
        valorTicket: p.valorTicket > 0 ? p.valorTicket : ticketMedio,
      }))
      // Ordenação já vem do aplicarRisco: mais dias sem consulta primeiro

    return Response.json(fila)
  } catch (error) {
    return Response.json({ error: "Erro ao buscar fila" }, { status: 500 })
  }
}
