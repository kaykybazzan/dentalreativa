import { pool } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Calcula a data limite no fuso de São Paulo no Node.js
    // para evitar problemas de timezone no Postgres (Neon roda em UTC)
    const limite = new Date()
    limite.setDate(limite.getDate() - 30)
    const limiteStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(limite)
    // limiteStr = "2026-05-01" — 30 dias atrás no fuso de SP

    const result = await pool.query(
      `UPDATE "Paciente"
       SET
         status = 'ativo'::"StatusPaciente",
         "atualizadoEm" = NOW()
       WHERE
         status = 'recuperado'::"StatusPaciente"
         AND "ultimaConsulta" IS NOT NULL
         AND "ultimaConsulta"::date <= $1::date
       RETURNING id, nome, "ultimaConsulta"`,
      [limiteStr]
    )

    console.log(`[cron] recuperado→ativo: ${result.rowCount} pacientes atualizados`)
    console.log(`[cron] data limite usada: ${limiteStr}`)

    return Response.json({
      success: true,
      atualizados: result.rowCount,
      dataLimite: limiteStr,
      pacientes: result.rows,
    })
  } catch (error) {
    console.error("[cron] erro ao atualizar recuperados:", error)
    return Response.json({ error: "Erro interno" }, { status: 500 })
  }
}