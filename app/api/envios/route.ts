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

    // Verificar quantas tentativas já foram feitas para esse paciente
    const tentativasResult = await pool.query(
      `SELECT COUNT(*) as total FROM "ContactAttempt"
       WHERE "pacienteId" = $1 AND "clinicaId" = $2`,
      [pacienteId, clinicaId]
    )
    const totalTentativas = parseInt(tentativasResult.rows[0]?.total) || 0

    // Máximo de 3 tentativas por paciente
    if (totalTentativas >= 3) {
      return Response.json({ error: "Máximo de tentativas atingido" }, { status: 400 })
    }

    const numeroDaTentativa = totalTentativas + 1

    // Calcular próxima tentativa baseada no número da tentativa atual
    // Tentativa 1 → próxima em 7 dias
    // Tentativa 2 → próxima em 14 dias
    // Tentativa 3 → última, não há próxima
    const diasParaProxima = numeroDaTentativa === 1 ? 7 : numeroDaTentativa === 2 ? 14 : null
    const proximaTentativa = diasParaProxima
      ? new Date(Date.now() + diasParaProxima * 24 * 60 * 60 * 1000)
      : null

    // Registrar a tentativa na tabela ContactAttempt
    await pool.query(
      `INSERT INTO "ContactAttempt" 
       ("pacienteId", "clinicaId", "criadoEm", "tentativaNumero", tipo)
       VALUES ($1, $2, NOW(), $3, 'enviado')`,
      [pacienteId, clinicaId, numeroDaTentativa]
    )

    // Atualizar status do paciente para 'em_contato'
    await pool.query(
      `UPDATE "Paciente" SET status = 'em_contato' WHERE id = $1`,
      [pacienteId]
    )

    // Se for a 3ª tentativa, marcar paciente como sem_resposta
    if (numeroDaTentativa === 3) {
      await pool.query(
        `UPDATE "Paciente" SET status = 'sem_resposta' WHERE id = $1`,
        [pacienteId]
      )
    }

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
