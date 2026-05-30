import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { pacienteId } = await req.json()

    // Buscar clinicaId
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

    // Verificar quantas tentativas já foram feitas
    const tentativasResult = await pool.query(
      `SELECT COUNT(*) as total FROM "ContactAttempt"
       WHERE "pacienteId" = $1 AND "clinicaId" = $2`,
      [pacienteId, clinicaId]
    )
    const totalTentativas = parseInt(tentativasResult.rows[0]?.total) || 0

    if (totalTentativas >= 3) {
      return Response.json({ error: "Máximo de tentativas atingido" }, { status: 400 })
    }

    const numeroDaTentativa = totalTentativas + 1

    const diasParaProxima = numeroDaTentativa === 1 ? 7 : numeroDaTentativa === 2 ? 14 : null
    const proximaTentativa = diasParaProxima
      ? new Date(Date.now() + diasParaProxima * 24 * 60 * 60 * 1000)
      : null

    // Registrar a tentativa
    await pool.query(
      `INSERT INTO "ContactAttempt" 
       ("pacienteId", "clinicaId", "criadoEm", "tentativaNumero", tipo)
       VALUES ($1, $2, NOW(), $3, 'enviado')`,
      [pacienteId, clinicaId, numeroDaTentativa]
    )

    // Definir novo status: sem_resposta só na 3ª, senão em_contato
    const novoStatus = numeroDaTentativa === 3 ? 'sem_resposta' : 'em_contato'

    // Atualizar paciente: status, tentativaAtual, ultimaTentativa e atualizadoEm
    await pool.query(
      `UPDATE "Paciente" SET
         status = $1::text::"StatusPaciente",
         "tentativaAtual" = $2,
         "ultimaTentativa" = NOW(),
         "atualizadoEm" = NOW()
       WHERE id = $3 AND "clinicaId" = $4`,
      [novoStatus, numeroDaTentativa, pacienteId, clinicaId]
    )

    return Response.json({
      success: true,
      tentativa: numeroDaTentativa,
      proximaTentativa,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao registrar envio" }, { status: 500 })
  }
}