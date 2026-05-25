import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const result = await pool.query(
      `SELECT cm.mensagem1, cm.mensagem2, cm.mensagem3, cm."mensagemDireta",
              cm."diasRiscoMedio", cm."diasRiscoAlto", cm."diasRiscoCritico"
       FROM "ConfiguracaoMensagens" cm
       INNER JOIN "Clinica" c ON c.id = cm."clinicaId"
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )

    // Se não tiver mensagens configuradas, retornar mensagens padrão
    if (result.rows.length === 0) {
      return Response.json({
        mensagem1: "Olá, {nome}! Tudo bem? Aqui é da {clinica}. Notamos que faz um tempo que não te vemos por aqui. Que tal agendar uma consulta de revisão? 😊",
        mensagem2: "Oi, {nome}! Passando para lembrar que sua saúde bucal é muito importante. Na {clinica} temos horários disponíveis para você. Vamos agendar?",
        mensagem3: "{nome}, essa é nossa última tentativa de contato. Adoraríamos ter você de volta na {clinica}. Se precisar de nós, estaremos aqui! 🦷",
        mensagemDireta: "Olá [nome]! Aqui é a [clinica]. Tudo bem? Que tal agendar sua consulta? 😊",
        diasRiscoMedio: 180,
        diasRiscoAlto: 270,
        diasRiscoCritico: 365,
      })
    }

    const row = result.rows[0]
    return Response.json({
      ...row,
      mensagemDireta: row.mensagemDireta ?? "Olá [nome]! Aqui é a [clinica]. Tudo bem? Que tal agendar sua consulta? 😊",
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao buscar mensagens" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { mensagem1, mensagem2, mensagem3, mensagemDireta, diasRiscoMedio, diasRiscoAlto, diasRiscoCritico } = await req.json()

    // Buscar o ID da clínica pelo email do usuário
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

    // Upsert — salva ou atualiza se já existir
    // Validar dias de risco no servidor
    const medio  = parseInt(diasRiscoMedio)  || 180
    const alto   = parseInt(diasRiscoAlto)   || 270
    const critico = parseInt(diasRiscoCritico) || 365

    if (medio < 30 || medio > 720) {
      return Response.json({ error: "Risco médio deve ser entre 30 e 720 dias." }, { status: 400 })
    }
    if (alto <= medio) {
      return Response.json({ error: "Risco alto deve ser maior que risco médio." }, { status: 400 })
    }
    if (critico <= alto) {
      return Response.json({ error: "Risco crítico deve ser maior que risco alto." }, { status: 400 })
    }

    await pool.query(
      `INSERT INTO "ConfiguracaoMensagens" 
        ("clinicaId", mensagem1, mensagem2, mensagem3, "mensagemDireta", "diasRiscoMedio", "diasRiscoAlto", "diasRiscoCritico")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("clinicaId")
       DO UPDATE SET 
         mensagem1 = $2, mensagem2 = $3, mensagem3 = $4, "mensagemDireta" = $5,
         "diasRiscoMedio" = $6, "diasRiscoAlto" = $7, "diasRiscoCritico" = $8`,
      [clinicaId, mensagem1, mensagem2, mensagem3, mensagemDireta, medio, alto, critico]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar mensagens:", error)
    return Response.json({ error: "Erro ao salvar mensagens" }, { status: 500 })
  }
}
