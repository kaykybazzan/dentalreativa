import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

function responderErro(message: string, status = 500) {
  return Response.json({ error: message }, { status })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return responderErro("Não autorizado", 401)
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { status, dataConsulta, horario, procedimento, observacao, valorConsulta } = body ?? {}

    const clinicaResult = await pool.query(
      `SELECT c.id
       FROM public."Clinica" c
       INNER JOIN public."Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )

    const clinicaId = clinicaResult.rows[0]?.id
    if (!clinicaId) {
      return responderErro("Clínica não encontrada", 404)
    }

    const agendamentoResult = await pool.query(
      `SELECT "pacienteId", "dataConsulta"
       FROM public."Agendamento"
       WHERE id = $1 AND "clinicaId" = $2`,
      [id, clinicaId]
    )

    if (agendamentoResult.rows.length === 0) {
      return responderErro("Agendamento não encontrado", 404)
    }

    const updates: string[] = [`"atualizadoEm" = NOW()`]
    const values: any[] = []
    let idx = 1

    if (status) {
      updates.push(`status = $${idx}::public."StatusAgendamento"`)
      values.push(status)
      idx++
    }

    if (dataConsulta !== undefined) {
      updates.push(`"dataConsulta" = $${idx}`)
      values.push(dataConsulta)
      idx++
    }

    if (horario !== undefined) {
      updates.push(`horario = $${idx}`)
      values.push(horario || null)
      idx++
    }

    if (procedimento !== undefined) {
      updates.push(`procedimento = $${idx}`)
      values.push(procedimento || null)
      idx++
    }

    if (observacao !== undefined) {
      updates.push(`observacao = $${idx}`)
      values.push(observacao || null)
      idx++
    }

    values.push(id, clinicaId)

    await pool.query(
      `UPDATE public."Agendamento"
       SET ${updates.join(", ")}
       WHERE id = $${idx} AND "clinicaId" = $${idx + 1}`,
      values
    )

    const pacienteId = agendamentoResult.rows[0].pacienteId
    const dataReal = dataConsulta || agendamentoResult.rows[0].dataConsulta

    if (status === "compareceu") {
      await pool.query(
        `UPDATE public."Paciente"
         SET status = 'recuperado'::public."StatusPaciente",
             "ultimaConsulta" = $1,
             "tentativaAtual" = 0,
             "ultimaTentativa" = NULL,
             "vaiMarcar" = FALSE,
             "atualizadoEm" = NOW()
         WHERE id = $2 AND "clinicaId" = $3`,
        [dataReal, pacienteId, clinicaId]
      )

      await pool.query(
        `INSERT INTO public."ContactAttempt"
          ("pacienteId", "clinicaId", "tentativaNumero", tipo, "valorRecuperado", "criadoEm")
         VALUES ($1, $2, 1, 'recuperado', $3, NOW())`,
        [pacienteId, clinicaId, valorConsulta ?? 0]
      )
    }

    if (status === "nao_compareceu") {
      await pool.query(
        `UPDATE public."Paciente"
         SET status = 'ativo'::public."StatusPaciente",
             "tentativaAtual" = 1,
             "ultimaTentativa" = NOW(),
             "vaiMarcar" = TRUE,
             "atualizadoEm" = NOW()
         WHERE id = $1 AND "clinicaId" = $2`,
        [pacienteId, clinicaId]
      )
    }

    if (status === "cancelado") {
    await pool.query(
      `UPDATE public."Paciente"
      SET status = 'ativo'::public."StatusPaciente",
          "vaiMarcar" = FALSE,
          "tentativaAtual" = 0,
          "ultimaTentativa" = NULL,
          "atualizadoEm" = NOW()
      WHERE id = $1 AND "clinicaId" = $2`,
      [pacienteId, clinicaId]
    )
  }

    return Response.json({ success: true })
  } catch (error) {
    console.error("[agendamentos/:id] erro ao atualizar:", error)
    return responderErro("Erro ao atualizar agendamento")
  }
}