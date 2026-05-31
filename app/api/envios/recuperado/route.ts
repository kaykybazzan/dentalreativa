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
      const valorFinal = valorRecuperado ?? 0
      console.log("[recuperado] valor recebido:", valorFinal, "pacienteId:", pacienteId)

      // Calcula a data atual no fuso de São Paulo no Node.js
      const hojeStr = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
      // hojeStr = "2026-05-30" — formato YYYY-MM-DD garantido pelo locale sv-SE

      await pool.query(
        `UPDATE "Paciente" SET
          status = 'recuperado'::"StatusPaciente",
          "ultimaConsulta" = $4,
          "tentativaAtual" = 0,
          "ultimaTentativa" = NULL,
          "vaiMarcar" = FALSE,
          "valorUltimaConsulta" = CASE WHEN $3 > 0 THEN $3 ELSE "valorUltimaConsulta" END,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId, valorFinal, hojeStr]
      )

      // Verifica se existe ContactAttempt para atualizar
      const caExiste = await pool.query(
        `SELECT id FROM "ContactAttempt"
         WHERE "pacienteId" = $1 AND "clinicaId" = $2
         ORDER BY "criadoEm" DESC LIMIT 1`,
        [pacienteId, clinicaId]
      )

      if (caExiste.rows.length > 0) {
        await pool.query(
          `UPDATE "ContactAttempt"
           SET tipo = 'recuperado', "valorRecuperado" = $1
           WHERE id = $2`,
          [valorFinal, caExiste.rows[0].id]
        )
      } else {
        // Sem ContactAttempt — insere um registro de recuperação direta
        await pool.query(
          `INSERT INTO "ContactAttempt"
           ("pacienteId", "clinicaId", "tentativaNumero", tipo, "valorRecuperado", "criadoEm")
           VALUES ($1, $2, 1, 'recuperado', $3, NOW())`,
          [pacienteId, clinicaId, valorFinal]
        )
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("[recuperado] erro:", error)
    return Response.json({ error: "Erro ao processar ação" }, { status: 500 })
  }
}