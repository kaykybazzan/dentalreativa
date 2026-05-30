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
    // Usar tentativaAtual do próprio Paciente como fonte de verdade
// (em vez de contar ContactAttempts, que podem acumular de sessões antigas)
const pacienteResult = await pool.query(
  `SELECT "tentativaAtual" FROM "Paciente"
   WHERE id = $1 AND "clinicaId" = $2`,
  [pacienteId, clinicaId]
)
if (pacienteResult.rows.length === 0) {
  return Response.json({ error: "Paciente não encontrado" }, { status: 404 })
}

const totalTentativas = parseInt(pacienteResult.rows[0].tentativaAtual) || 0

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

    // Definir novo status usando valores reais do enum StatusPaciente
    const novoStatus = numeroDaTentativa === 3 ? 'aguardando_resposta' : 'contatado'

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