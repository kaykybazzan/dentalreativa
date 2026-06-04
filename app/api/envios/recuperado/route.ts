import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

// ─── Helper: data de hoje no fuso de São Paulo como "YYYY-MM-DD" ──────────────
// Usa Intl.DateTimeFormat para garantir que o resultado é sempre a data correta
// em São Paulo, independente do fuso do servidor (Vercel roda em UTC).
function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  // Resultado: "2026-05-31" (sv-SE garante formato ISO YYYY-MM-DD)
}

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
        status = 'ativo'::"StatusPaciente",
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
          status = 'ativo'::"StatusPaciente",
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

      const hojeStr = hojeEmSaoPaulo()
      console.log("[recuperado] data hoje SP:", hojeStr)

      // Buscar valor anterior ANTES do UPDATE sobrescrever valorUltimaConsulta
      const valorAnteriorResult = await pool.query(
        `SELECT COALESCE("valorUltimaConsulta", 0) as valor
         FROM "Paciente" WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )
      const valorAnterior = valorAnteriorResult.rows[0]?.valor ?? 0

      await pool.query(
        `UPDATE "Paciente" SET
          status = 'recuperado'::"StatusPaciente",
          "ultimaConsulta" = $4::date,
          "tentativaAtual" = 0,
          "ultimaTentativa" = NULL,
          "vaiMarcar" = FALSE,
          "valorUltimaConsulta" = CASE WHEN $3 > 0 THEN $3 ELSE "valorUltimaConsulta" END,
          "atualizadoEm" = NOW()
        WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId, valorFinal, hojeStr]
      )

      const ehEspontaneo = body.espontaneo === true

      if (ehEspontaneo) {
        // Espontâneo: insere CA novo com tentativaNumero=0, nunca toca CAs existentes
        const valorParaGravar = valorFinal > 0 ? valorFinal : valorAnterior

        await pool.query(
          `INSERT INTO "ContactAttempt"
          ("pacienteId", "clinicaId", "tentativaNumero", tipo, "valorRecuperado", "criadoEm")
          VALUES ($1, $2, 0, 'espontaneo', $3, NOW())`,
          [pacienteId, clinicaId, valorParaGravar]
        )
      } else {
        // Via contato: atualiza o CA mais recente com tipo='enviado' para tipo='recuperado'
        const caExiste = await pool.query(
          `SELECT id FROM "ContactAttempt"
           WHERE "pacienteId" = $1 AND "clinicaId" = $2
             AND tipo = 'enviado'
           ORDER BY "criadoEm" DESC LIMIT 1`,
          [pacienteId, clinicaId]
        )

        if (caExiste.rows.length > 0) {
          const valorParaGravar = valorFinal > 0 ? valorFinal : valorAnterior
          await pool.query(
            `UPDATE "ContactAttempt"
            SET tipo = 'recuperado', "valorRecuperado" = $1
            WHERE id = $2`,
            [valorParaGravar, caExiste.rows[0].id]
          )
        } else {
          // Sem CA prévio com tipo='enviado': registra como espontâneo por segurança
          await pool.query(
            `INSERT INTO "ContactAttempt"
            ("pacienteId", "clinicaId", "tentativaNumero", tipo, "valorRecuperado", "criadoEm")
            VALUES ($1, $2, 0, 'espontaneo', $3, NOW())`,
            [pacienteId, clinicaId, valorFinal > 0 ? valorFinal : valorAnterior]
          )
        }
      }
    } // fecha o bloco else principal (acao === "recuperado")

    return Response.json({ success: true })

  } catch (error) {
    console.error("[recuperado] erro:", error)
    return Response.json({ error: "Erro ao processar ação" }, { status: 500 })
  }
}

