import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT 
         c.nome,
         c.telefone,
         c.cidade,
         c."ticketMedio" as ticket_medio,
         COUNT(p.id) as total_pacientes,
         EXISTS(
           SELECT 1 FROM "ConfiguracaoMensagens" cm 
           WHERE cm."clinicaId" = c.id
         ) as tem_mensagens
       FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       LEFT JOIN "Paciente" p ON p."clinicaId" = c.id
       WHERE u.email = $1
       GROUP BY c.id, c.nome, c.telefone, c.cidade, c."ticketMedio"`,
      [session.user.email]
    );

    const clinica = result.rows[0];
    if (!clinica) {
      return Response.json({ completo: false, alertas: ["Clínica não encontrada"] });
    }

    const alertas = [];

    if (!clinica.nome || clinica.nome.trim() === "") {
      alertas.push("nome_clinica");
    }
    if (!clinica.telefone) {
      alertas.push("telefone");
    }
    if (!clinica.ticket_medio || parseFloat(clinica.ticket_medio) === 0) {
      alertas.push("ticket_medio");
    }
    if (parseInt(clinica.total_pacientes) === 0) {
      alertas.push("sem_pacientes");
    }
    if (!clinica.tem_mensagens) {
      alertas.push("sem_mensagens");
    }

    return Response.json({
      completo: alertas.length === 0,
      alertas,
      totalPacientes: parseInt(clinica.total_pacientes),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Erro ao verificar status" }, { status: 500 });
  }
}