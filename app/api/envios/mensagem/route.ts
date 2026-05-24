import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const pacienteId = searchParams.get("pacienteId")

    // Buscar dados do paciente
    const pacienteResult = await pool.query(
      `SELECT nome FROM "Paciente" WHERE id = $1`,
      [pacienteId]
    )
    const paciente = pacienteResult.rows[0]

    // Buscar quantas tentativas já foram feitas
    const tentativasResult = await pool.query(
      `SELECT COUNT(*) as total FROM "ContactAttempt"
       WHERE "pacienteId" = $1`,
      [pacienteId]
    )
    const totalTentativas = parseInt(tentativasResult.rows[0]?.total) || 0
    const proximaTentativa = totalTentativas + 1 // 1, 2 ou 3

    // Buscar mensagens configuradas da clínica
    const clinicaResult = await pool.query(
      `SELECT c.id, c.nome as nome_clinica, cm.mensagem1, cm.mensagem2, cm.mensagem3
       FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       LEFT JOIN "ConfiguracaoMensagens" cm ON cm."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    )
    const clinica = clinicaResult.rows[0]

    // Mensagens padrão caso a clínica não tenha configurado
    const mensagensPadrao = {
      mensagem1: `Olá, ${paciente?.nome}! Tudo bem? Aqui é da ${clinica?.nome_clinica}. Notamos que faz um tempo que não te vemos por aqui. Que tal agendar uma consulta de revisão? Estamos te esperando! 😊`,
      mensagem2: `Oi, ${paciente?.nome}! Passando para lembrar que sua saúde bucal é muito importante. Na ${clinica?.nome_clinica} temos horários disponíveis para você. Vamos agendar?`,
      mensagem3: `${paciente?.nome}, essa é nossa última tentativa de contato. Adoraríamos ter você de volta na ${clinica?.nome_clinica}. Se precisar de nós, estaremos aqui! 🦷`,
    }

    // Selecionar a mensagem correta baseada no número da tentativa
    // Se a clínica não configurou mensagens, usar o padrão
    let mensagem = ""
    if (proximaTentativa === 1) {
      mensagem = clinica?.mensagem1 || mensagensPadrao.mensagem1
    } else if (proximaTentativa === 2) {
      mensagem = clinica?.mensagem2 || mensagensPadrao.mensagem2
    } else {
      mensagem = clinica?.mensagem3 || mensagensPadrao.mensagem3
    }

    // Substituir variáveis na mensagem
    // {nome} → nome do paciente
    // {clinica} → nome da clínica
    mensagem = mensagem
      .replace(/\[nome\]/g, paciente?.nome || "")
      .replace(/\[clinica\]/g, clinica?.nome_clinica || "")
      .replace(/{nome}/g, paciente?.nome || "")
      .replace(/{clinica}/g, clinica?.nome_clinica || "")

    return Response.json({
      mensagem,
      tentativa: proximaTentativa,
      nomePaciente: paciente?.nome,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Erro ao buscar mensagem" }, { status: 500 })
  }
}
