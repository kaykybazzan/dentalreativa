import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

type AgendaItemDB = {
  id: string
  tipo: "consulta"
  pacienteId: number
  pacienteNome: string
  pacienteTelefone: string
  dataReferencia: string
  motivo: string
  horario: string | null
  procedimento: string | null
  agendamentoId: number | null
  statusAgendamento: string | null
}

function responderErro(message: string, status = 500) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return responderErro("Não autorizado", 401)
  }

  try {
    const url = new URL(req.url)
    const contagem = url.searchParams.get("contagem") === "true"

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

    if (contagem) {
      let total = 0

      try {
        const consultas = await pool.query(
          `SELECT COUNT(*) AS total
           FROM public."Agendamento"
WHERE "clinicaId" = $1
  AND status::text IN ('agendado', 'confirmado')`,
          [clinicaId]
        )
        total += parseInt(String(consultas.rows[0]?.total ?? "0"), 10)
      } catch (e) {
        console.warn("[agendamentos] contagem consultas falhou:", e)
      }


      return Response.json({ count: total, total })
    }

    const consultas = await pool.query(
      `SELECT
         'ag_' || a.id::text                             AS id,
         'consulta'                                      AS tipo,
         p.id                                            AS "pacienteId",
         p.nome                                          AS "pacienteNome",
         COALESCE(p.telefone, '')                        AS "pacienteTelefone",
         a."dataConsulta"::text                          AS "dataReferencia",
         COALESCE(a.procedimento, 'Consulta agendada')   AS motivo,
         a.horario::text                                 AS horario,
         a.procedimento                                  AS procedimento,
         a.id                                            AS "agendamentoId",
         a.status::text                                  AS "statusAgendamento"
       FROM public."Agendamento" a
       INNER JOIN public."Paciente" p ON p.id = a."pacienteId"
       WHERE a."clinicaId" = $1
         AND a.status::text IN ('agendado', 'confirmado')
         AND a."dataConsulta" >= (CURRENT_DATE - INTERVAL '30 days')
       ORDER BY a."dataConsulta" ASC, a.horario ASC NULLS LAST, p.nome ASC`,
      [clinicaId]
    )

    const itens: AgendaItemDB[] = consultas.rows.map((row) => ({
      id: String(row.id),
      tipo: "consulta",
      pacienteId: Number(row.pacienteId),
      pacienteNome: String(row.pacienteNome ?? ""),
      pacienteTelefone: String(row.pacienteTelefone ?? ""),
      dataReferencia: String(row.dataReferencia).slice(0, 10),
      motivo: String(row.motivo ?? "Consulta agendada"),
      horario: row.horario ? String(row.horario).slice(0, 5) : null,
      procedimento: row.procedimento ? String(row.procedimento) : null,
      agendamentoId: row.agendamentoId ? Number(row.agendamentoId) : null,
      statusAgendamento: row.statusAgendamento ? String(row.statusAgendamento) : null,
    }))

    return Response.json(itens)
  } catch (error) {
    console.error("[agendamentos] erro geral:", error)
    return responderErro("Erro ao buscar agenda")
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return responderErro("Não autorizado", 401)
  }

  try {
    const body = await req.json()
    const {
      pacienteId,
      dataConsulta,
      horario = null,
      procedimento = null,
      observacao = null,
    } = body ?? {}

    if (!pacienteId || !dataConsulta) {
      return responderErro("Paciente e data são obrigatórios", 400)
    }

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

    const paciente = await pool.query(
      `SELECT id FROM public."Paciente"
       WHERE id = $1 AND "clinicaId" = $2`,
      [pacienteId, clinicaId]
    )

    if (paciente.rows.length === 0) {
      return responderErro("Paciente não encontrado", 404)
    }

    const created = await pool.query(
      `INSERT INTO public."Agendamento"
        ("pacienteId", "clinicaId", "dataConsulta", horario, procedimento, observacao, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'agendado'::public."StatusAgendamento")
       RETURNING id`,
      [
        pacienteId,
        clinicaId,
        dataConsulta,
        horario || null,
        procedimento || null,
        observacao || null,
      ]
    )

    return Response.json(
      { success: true, agendamentoId: created.rows[0]?.id ?? null },
      { status: 201 }
    )
  } catch (error) {
    console.error("[agendamentos] erro ao criar:", error)
    return responderErro("Erro ao criar agendamento")
  }
}