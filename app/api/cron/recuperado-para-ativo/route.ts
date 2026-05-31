import { pool } from "@/lib/db"
import { NextRequest } from "next/server"

// Rota chamada pelo Vercel Cron uma vez por dia.
// Atualiza pacientes com status "recuperado" há 30+ dias para "ativo".

export async function GET(req: NextRequest) {
  // Proteção: só aceita chamadas com o CRON_SECRET correto
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const result = await pool.query(
      `UPDATE "Paciente"
       SET
         status = 'ativo'::"StatusPaciente",
         "atualizadoEm" = NOW()
       WHERE
         status = 'recuperado'::"StatusPaciente"
         AND "ultimaConsulta" IS NOT NULL
         AND "ultimaConsulta" <= (CURRENT_DATE - INTERVAL '30 days')
       RETURNING id, nome, "ultimaConsulta"`
    )

    console.log(`[cron] recuperado→ativo: ${result.rowCount} pacientes atualizados`)

    return Response.json({
      success: true,
      atualizados: result.rowCount,
      pacientes: result.rows,
    })
  } catch (error) {
    console.error("[cron] erro ao atualizar recuperados:", error)
    return Response.json({ error: "Erro interno" }, { status: 500 })
  }
}