import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const clinicaResult = await pool.query(
      `SELECT c.id FROM "Clinica" c
       INNER JOIN "Usuario" u ON u."clinicaId" = c.id
       WHERE u.email = $1`,
      [session.user.email]
    );
    const clinicaId = clinicaResult.rows[0]?.id;

    // Buscar todos os pacientes com suas tentativas de contato
    const result = await pool.query(
      `SELECT 
         p.nome,
         p.telefone,
         p."ultimaConsulta",
         p.status,
         p.dadosIncompletos,
         p."valorUltimaConsulta",
         COUNT(ca.id) as total_tentativas,
         MAX(ca."criadoEm") as ultimo_contato,
         SUM(ca.valor_recuperado) as valor_recuperado
       FROM "Paciente" p
       LEFT JOIN "ContactAttempt" ca ON ca."pacienteId" = p.id
       WHERE p."clinicaId" = $1
       GROUP BY p.id, p.nome, p.telefone, p."ultimaConsulta", 
                p.status, p.dadosIncompletos, p."valorUltimaConsulta"
       ORDER BY p.nome ASC`,
      [clinicaId]
    );

    // Gerar CSV
    const cabecalho = [
      "Nome",
      "Telefone",
      "Ultima Consulta",
      "Status",
      "Dados Incompletos",
      "Ticket (R$)",
      "Total Tentativas",
      "Ultimo Contato",
      "Valor Recuperado (R$)",
    ].join(",");

    const linhas = result.rows.map((p) => [
      `"${p.nome ?? ""}"`,
      `"${p.telefone ?? ""}"`,
      `"${p.ultimaConsulta ? new Date(p.ultimaConsulta).toLocaleDateString("pt-BR") : ""}"`,
      `"${p.status ?? ""}"`,
      `"${p.dadosIncompletos ? "Sim" : "Não"}"`,
      `"${parseFloat(p.valorUltimaConsulta || 0).toFixed(2)}"`,
      `"${p.total_tentativas ?? 0}"`,
      `"${p.ultimo_contato ? new Date(p.ultimo_contato).toLocaleDateString("pt-BR") : ""}"`,
      `"${parseFloat(p.valor_recuperado || 0).toFixed(2)}"`,
    ].join(","));

    const csv = [cabecalho, ...linhas].join("\n");

    // Retornar como arquivo CSV para download
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dentalreativa-relatorio-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Erro ao exportar" }, { status: 500 });
  }
}
