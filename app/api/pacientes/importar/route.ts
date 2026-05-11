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

    console.log("📋 Primeiros 3 pacientes recebidos:", 
      pacientes.slice(0, 3).map(p => ({
        nome: p.nome,
        telefone: p.telefone,
        ultimaConsulta: p.ultimaConsulta,
        tipoData: typeof p.ultimaConsulta
      }))
    )

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
      
      // Validar data — se vier inválida, salvar como null
      let dataValida: string | null = null;
      if (p.ultimaConsulta && p.ultimaConsulta !== "") {
        // Verificar se é uma data válida antes de mandar para o banco
        const dataTestada = new Date(p.ultimaConsulta);
        if (!isNaN(dataTestada.getTime())) {
          dataValida = p.ultimaConsulta;
        } else {
          console.log(`⚠️ Data inválida ignorada: "${p.ultimaConsulta}" para paciente "${nomeValido}"`);
        }
      }

      const dadosIncompletos = !nomeValido || !telefoneLimpo || !dataValida;

      if (dadosIncompletos) {
        incompletos++;
      }

      // Checar duplicata apenas se tiver telefone
      if (telefoneLimpo) {
        const duplicata = await pool.query(
          `SELECT id FROM "Paciente" WHERE "clinicaId" = $1 AND telefone = $2`,
          [clinicaId, telefoneLimpo]
        )
        if (duplicata.rows.length > 0) {
          duplicados++
          continue
        }
      }

      // Inserir com data como null se inválida — nunca enviar string inválida para o banco
      await pool.query(
        `INSERT INTO "Paciente" ("clinicaId", nome, telefone, "ultimaConsulta", "dadosIncompletos", status)
         VALUES ($1, $2, $3, $4::date, $5, 'ativo')`,
        [
          clinicaId,
          nomeValido || "Sem nome",
          telefoneLimpo || null,
          dataValida,  // null se inválida — o banco aceita null em campo date
          dadosIncompletos,
        ]
      )
      importados++
    }

    return Response.json({ importados, duplicados, incompletos })
  } catch (error) {
    console.error("Erro ao importar pacientes:", error)
    return Response.json({ error: "Erro ao importar pacientes" }, { status: 500 })
  }
}
