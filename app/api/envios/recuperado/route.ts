import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { pacienteId, valorRecuperado, acao } = await req.json()

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

    if (acao === "nao_contatar") {
      await pool.query(
        `UPDATE "Paciente" SET
          status = 'nao_contatar'::text::"StatusPaciente",
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

    } else if (acao === "numero_errado") {
      await pool.query(
        `UPDATE "Paciente" SET
          "dadosIncompletos" = true,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

    } else if (acao === "vai_marcar") {
      await pool.query(
        `UPDATE "Paciente" SET
          "ultimaTentativa" = NOW(),
          "vaiMarcar" = TRUE,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

    } else {
      // acao === "recuperado" (padrão)
      await pool.query(
        `UPDATE "Paciente" SET
          status = 'recuperado'::text::"StatusPaciente",
          "ultimaConsulta" = NOW(),
          "tentativaAtual" = 0,
          "ultimaTentativa" = NULL,
          "vaiMarcar" = FALSE,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

      await pool.query(
        `UPDATE "ContactAttempt"
          SET tipo = 'recuperado', "valorRecuperado" = $1
          WHERE "pacienteId" = $2 AND "clinicaId" = $3
          AND id = (
            SELECT id FROM "ContactAttempt"
            WHERE "pacienteId" = $2 AND "clinicaId" = $3
            ORDER BY "criadoEm" DESC LIMIT 1
          )`,
        [valorRecuperado || 0, pacienteId, clinicaId]
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao processar ação" }, { status: 500 })
  }
}