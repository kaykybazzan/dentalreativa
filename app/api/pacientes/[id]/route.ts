import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { telefone, ultimaConsulta, status } = body

    // Buscar clinicaId para garantir tenant isolation
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

    // Validar data futura
    if (ultimaConsulta) {
      const dataInformada = new Date(ultimaConsulta)
      const hoje = new Date()
      hoje.setHours(23, 59, 59, 999)
      if (dataInformada > hoje) {
        return Response.json(
          { error: "A data da última consulta não pode ser posterior a hoje." },
          { status: 400 }
        )
      }
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (telefone !== undefined) {
      const telefoneLimpo = String(telefone).replace(/\D/g, "")
      updates.push(`telefone = $${paramIndex}`)
      values.push(telefoneLimpo)
      paramIndex++
    }

    if (ultimaConsulta !== undefined) {
      updates.push(`"ultimaConsulta" = $${paramIndex}`)
      values.push(ultimaConsulta || null)
      paramIndex++
    }

    if (status !== undefined) {
      const statusPermitidos = [
        "ativo",
        "contatado",
        "aguardando_resposta",
        "recuperado",
        "nao_contatar",
      ]
      if (!statusPermitidos.includes(status)) {
        return Response.json({ error: "Status inválido" }, { status: 400 })
      }
      updates.push(`status = $${paramIndex}::"StatusPaciente"`)
      values.push(status)
      paramIndex++
    }

    if (body.nome !== undefined) {
      updates.push(`nome = $${paramIndex}`)
      values.push(body.nome)
      paramIndex++
    }

    if (body.valorUltimaConsulta !== undefined) {
      updates.push(`"valorUltimaConsulta" = $${paramIndex}`)
      values.push(
        body.valorUltimaConsulta !== null && body.valorUltimaConsulta !== ""
          ? parseFloat(String(body.valorUltimaConsulta))
          : null
      )
      paramIndex++
    }

    if (body.procedimento !== undefined) {
      updates.push(`procedimento = $${paramIndex}`)
      values.push(body.procedimento || null)
      paramIndex++
    }

    if (updates.length === 0) {
      return Response.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    // Reseta dadosIncompletos se ultimaConsulta foi preenchida
    if (ultimaConsulta) {
      updates.push(`"dadosIncompletos" = false`)
    }

    // FIX: se o paciente é "recuperado" e a ultimaConsulta editada tem 30+ dias,
    // já converte para "ativo" na hora — sem esperar o cron
    if (ultimaConsulta && !status) {
      const dataConsulta = new Date(ultimaConsulta)
      const limite = new Date()
      limite.setDate(limite.getDate() - 30)

      // Busca o status atual do paciente
      const pacienteAtual = await pool.query(
        `SELECT status FROM "Paciente" WHERE id = $1 AND "clinicaId" = $2`,
        [id, clinicaId]
      )
      const statusAtual = pacienteAtual.rows[0]?.status

      if (statusAtual === "recuperado" && dataConsulta <= limite) {
        updates.push(`status = 'ativo'::"StatusPaciente"`)
      }
    }

    updates.push(`"atualizadoEm" = NOW()`)

    values.push(id, clinicaId)

    await pool.query(
      `UPDATE "Paciente"
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex} AND "clinicaId" = $${paramIndex + 1}`,
      values
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error)
    return Response.json({ error: "Erro ao atualizar paciente" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { id } = await params

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

    // Verificar que o paciente pertence à clínica (tenant guard)
    const pacienteCheck = await pool.query(
      `SELECT id FROM "Paciente" WHERE id = $1 AND "clinicaId" = $2`,
      [id, clinicaId]
    )
    if (pacienteCheck.rows.length === 0) {
      return Response.json({ error: "Paciente não encontrado" }, { status: 404 })
    }

    // Deletar agendamentos do paciente primeiro
    await pool.query(
      `DELETE FROM "Agendamento" WHERE "pacienteId" = $1 AND "clinicaId" = $2`,
      [id, clinicaId]
    )

    // Deletar ContactAttempts
    await pool.query(
      `DELETE FROM "ContactAttempt" WHERE "pacienteId" = $1 AND "clinicaId" = $2`,
      [id, clinicaId]
    )

    // Deletar paciente
    await pool.query(
      `DELETE FROM "Paciente" WHERE id = $1 AND "clinicaId" = $2`,
      [id, clinicaId]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar paciente:", error)
    return Response.json({ error: "Erro ao deletar paciente" }, { status: 500 })
  }
}