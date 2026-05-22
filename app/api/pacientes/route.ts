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
      `SELECT p.* FROM "Paciente" p
       INNER JOIN "Clinica" c ON c.id = p."clinicaId"
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1
       ORDER BY p.nome ASC`,
      [session.user.email]
    )
    return Response.json(result.rows)
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error)
    return Response.json({ error: "Erro ao buscar pacientes" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { nome, telefone, ultimaConsulta, valor_ticket, procedimento } = await req.json()

    // Buscar clinica_id
    const clinicaResult = await pool.query(
      `SELECT c.id FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const clinicaId = clinicaResult.rows[0]?.id

    if (!clinicaId) {
      return Response.json({ error: "Clínica não encontrada" }, { status: 404 })
    }

    // Normalizar telefone — remover tudo que não for número
    const telefoneLimpo = telefone?.replace(/\D/g, "") ?? ""

    // Verificar dados incompletos
    const dadosIncompletos = !nome || !telefoneLimpo || !ultimaConsulta

    // Verificar duplicata por telefone
    const duplicata = await pool.query(
      `SELECT id FROM "Paciente" WHERE "clinicaId" = $1 AND telefone = $2`,
      [clinicaId, telefoneLimpo]
    )
    if (duplicata.rows.length > 0) {
      return Response.json({ error: "Paciente com esse telefone já existe" }, { status: 409 })
    }

    // Converter valor_ticket para número se vier como string
    const valorUltimaConsulta = valor_ticket ? parseFloat(String(valor_ticket)) : null

    await pool.query(
      `INSERT INTO "Paciente" ("clinicaId", nome, telefone, "ultimaConsulta", "valorUltimaConsulta", procedimento, "dadosIncompletos", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ativo')`,
      [clinicaId, nome, telefoneLimpo, ultimaConsulta || null, valorUltimaConsulta, procedimento || null, dadosIncompletos]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao cadastrar paciente:", error)
    return Response.json({ error: "Erro ao cadastrar paciente" }, { status: 500 })
  }
}
