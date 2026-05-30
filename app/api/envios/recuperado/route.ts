import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { pacienteId, valorRecuperado, acao } = body

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

    // Garantir que o paciente pertence à clínica
    const pacienteCheck = await pool.query(
      `SELECT id FROM "Paciente" WHERE id = $1 AND "clinicaId" = $2`,
      [pacienteId, clinicaId]
    )
    if (pacienteCheck.rows.length === 0) {
      return Response.json({ error: "Paciente não encontrado" }, { status: 404 })
    }

    if (acao === "nao_contatar") {
      await pool.query(
        `UPDATE "Paciente" SET
          status = 'nao_contatar'::"StatusPaciente",
          "vaiMarcar" = FALSE,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

    } else if (acao === "numero_errado") {
      await pool.query(
        `UPDATE "Paciente" SET
          "dadosIncompletos" = true,
          "vaiMarcar" = FALSE,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

    } else if (acao === "vai_marcar") {
      const { dataConsulta, horario, procedimento } = body

      if (dataConsulta) {
        // Paciente definiu data: cria agendamento e remove da fila de follow-up
        const dataConsultaNormalizada = String(dataConsulta).slice(0, 10)

        await pool.query(
          `INSERT INTO public."Agendamento"
            ("pacienteId", "clinicaId", "dataConsulta", horario, procedimento, status)
          VALUES ($1, $2, $3::date, $4, $5, 'agendado'::public."StatusAgendamento")`,
          [
            pacienteId,
            clinicaId,
            dataConsultaNormalizada,
            horario || null,
            procedimento || null,
          ]
        )

        await pool.query(
          `UPDATE "Paciente" SET
            "vaiMarcar" = FALSE,
            "ultimaTentativa" = NOW(),
            "tentativaAtual" = GREATEST("tentativaAtual", 1),
            "atualizadoEm" = NOW()
          WHERE id = $1 AND "clinicaId" = $2`,
          [pacienteId, clinicaId]
        )
      } else {
        // Prometeu marcar depois: entra na fila de follow-up em 7 dias
        await pool.query(
          `UPDATE "Paciente" SET
            "vaiMarcar" = TRUE,
            "ultimaTentativa" = NOW(),
            "tentativaAtual" = GREATEST("tentativaAtual", 1),
            "atualizadoEm" = NOW()
          WHERE id = $1 AND "clinicaId" = $2`,
          [pacienteId, clinicaId]
        )
      }

    } else if (acao === "feito_follow_up") {
      // Follow-up concluído manualmente na Agenda — remove da fila
      await pool.query(
        `UPDATE "Paciente" SET
          "vaiMarcar" = FALSE,
          "ultimaTentativa" = NOW(),
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

    } else {
      // acao === "recuperado" (padrão — paciente voltou)
      await pool.query(
        `UPDATE "Paciente" SET
          status = 'recuperado'::"StatusPaciente",
          "ultimaConsulta" = NOW(),
          "tentativaAtual" = 0,
          "ultimaTentativa" = NULL,
          "vaiMarcar" = FALSE,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )

      // Atualiza o último ContactAttempt como recuperado
      await pool.query(
        `UPDATE "ContactAttempt"
         SET tipo = 'recuperado', "valorRecuperado" = $1
         WHERE id = (
           SELECT id FROM "ContactAttempt"
           WHERE "pacienteId" = $2 AND "clinicaId" = $3
           ORDER BY "criadoEm" DESC
           LIMIT 1
         )`,
        [valorRecuperado ?? 0, pacienteId, clinicaId]
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("[recuperado] erro:", error)
    return Response.json({ error: "Erro ao processar ação" }, { status: 500 })
  }
}