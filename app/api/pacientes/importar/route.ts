import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { pacientes } = await req.json()

    if (!Array.isArray(pacientes)) {
      return Response.json({ error: "Formato inválido: esperado array de pacientes" }, { status: 400 })
    } 

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

    let importados = 0
    let duplicados = 0
    let incompletos = 0

    for (const p of pacientes) {
  const telefoneLimpo = String(p.telefone ?? "").replace(/\D/g, "")
      const nomeValido = String(p.nome ?? "").trim()

      const valorRaw = p.valor_ticket ?? p.valorTicket ?? p.valorUltimaConsulta ?? null
      const valorTicket = valorRaw ? parseFloat(String(valorRaw)) : null
      
      let dataValida: string | null = null;
      if (p.ultimaConsulta && p.ultimaConsulta !== "") {
        const dataTestada = new Date(p.ultimaConsulta);
        if (!isNaN(dataTestada.getTime())) {
          dataValida = p.ultimaConsulta;
        }
      }

      const dadosIncompletos = !nomeValido || !telefoneLimpo || !dataValida;

      if (dadosIncompletos) {
        incompletos++;
      }

      if (!telefoneLimpo) {
        await pool.query(
          `INSERT INTO "Paciente" ("clinicaId", nome, telefone, "ultimaConsulta", "valorUltimaConsulta", "dadosIncompletos", status)
          VALUES ($1, $2, $3, $4::date, $5, $6, 'ativo')`,
          [clinicaId, nomeValido || "Sem nome", `incompleto_${Date.now()}`, dataValida, valorTicket, true]
        )
        continue
      }

      const result = await pool.query(
  `INSERT INTO "Paciente" ("clinicaId", nome, telefone, "ultimaConsulta", "valorUltimaConsulta", "dadosIncompletos", status)
   VALUES ($1, $2, $3, $4::date, $5, $6, 'ativo')
   ON CONFLICT ("clinicaId", telefone) DO NOTHING
   RETURNING id`,
  [
    clinicaId,
    nomeValido || "Sem nome",
    telefoneLimpo || null,
    dataValida,
    valorTicket,
    dadosIncompletos,
  ]
)
if (result.rowCount === 0) {
  duplicados++
} else {
  importados++
}
    }

    return Response.json({ importados, duplicados, incompletos })
  } catch (error) {
    console.error("Erro ao importar pacientes:", error)
    return Response.json({ error: "Erro ao importar pacientes" }, { status: 500 })
  }
}

