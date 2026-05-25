import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { telefone, ultimaConsulta, status } = body

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

    // Montar query dinamicamente — só atualiza campos enviados
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (telefone !== undefined) {
      const telefoneLimpo = telefone.replace(/\D/g, "")
      updates.push(`telefone = $${paramIndex}`)
      values.push(telefoneLimpo)
      paramIndex++
    }

    if (ultimaConsulta !== undefined) {
      updates.push(`"ultimaConsulta" = $${paramIndex}`)
      values.push(ultimaConsulta)
      paramIndex++
    }

    if (status !== undefined) {
      // Validar status permitidos
      const statusPermitidos = ['ativo', 'em_contato', 'recuperado', 'sem_resposta', 'nao_contatar']
      if (!statusPermitidos.includes(status)) {
        return Response.json({ error: "Status inválido" }, { status: 400 })
      }
      updates.push(`status = $${paramIndex}`)
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
      values.push(body.valorUltimaConsulta ? parseFloat(String(body.valorUltimaConsulta)) : null)
      paramIndex++
    }

    if (body.procedimento !== undefined) {
      updates.push(`procedimento = $${paramIndex}`)
      values.push(body.procedimento)
      paramIndex++
    }

    if (updates.length === 0) {
      return Response.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    // Se ultimaConsulta está sendo preenchida agora, reseta dadosIncompletos
    if (ultimaConsulta !== undefined && ultimaConsulta !== null && ultimaConsulta !== '') {
      updates.push(`"dadosIncompletos" = false`)
    } else {
      updates.push(`"dadosIncompletos" = CASE WHEN telefone != '' AND "ultimaConsulta" IS NOT NULL THEN false ELSE "dadosIncompletos" END`)
    }
    
    values.push(id)
    await pool.query(
      `UPDATE "Paciente" SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error)
    return Response.json({ error: "Erro ao atualizar paciente" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { id } = await params

    // Deletar ContactAttempts primeiro (foreign key)
    await pool.query(
      `DELETE FROM "ContactAttempt" WHERE "pacienteId" = $1`,
      [id]
    )

    // Deletar paciente
    await pool.query(
      `DELETE FROM "Paciente" WHERE id = $1`,
      [id]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar paciente:", error)
    return Response.json({ error: "Erro ao deletar paciente" }, { status: 500 })
  }
}
