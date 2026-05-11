export type NivelRisco = "critico" | "alto" | "medio" | "ok";

export interface PacienteComRisco {
  id: string;
  nome: string;
  telefone: string;
  ultimaConsulta: string;
  diasSemConsulta: number;
  nivelRisco: NivelRisco;
  valorTicket: number;
  status: string;
  dadosIncompletos: boolean;
}

// Calcula quantos dias se passaram desde a última consulta
export function calcularDiasSemConsulta(ultimaConsulta: string | Date): number {
  const hoje = new Date();
  const consulta = new Date(ultimaConsulta);
  const diffMs = hoje.getTime() - consulta.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDias;
}

// Classifica o nível de risco baseado nos dias sem consulta
export function classificarRisco(dias: number): NivelRisco {
  if (dias >= 365) return "critico";  // 1 ano ou mais — urgente
  if (dias >= 270) return "alto";     // 9 meses ou mais
  if (dias >= 180) return "medio";    // 6 meses ou mais — padrão de recontato
  return "ok";                         // menos de 6 meses — não precisa contato
}

// Aplica risco a um array de pacientes
// IMPORTANTE: exclui pacientes com dadosIncompletos = true
// IMPORTANTE: exclui pacientes com status = 'nao_contatar'
// IMPORTANTE: exclui pacientes com status = 'recuperado'
export function aplicarRisco(pacientes: any[]): PacienteComRisco[] {
  return pacientes
    .filter((p) => !p.dadosIncompletos)
    .filter((p) => p.status !== "nao_contatar")
    .filter((p) => p.status !== "recuperado")
    .filter((p) => p.ultimaConsulta !== null)
    .map((p) => {
      const diasSemConsulta = calcularDiasSemConsulta(p.ultimaConsulta);
      return {
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        ultimaConsulta: p.ultimaConsulta,
        diasSemConsulta,
        nivelRisco: classificarRisco(diasSemConsulta),
        valorTicket: parseFloat(p.valorUltimaConsulta) || 0,
        status: p.status,
        dadosIncompletos: p.dadosIncompletos,
      };
    })
    .sort((a, b) => b.diasSemConsulta - a.diasSemConsulta); // mais urgentes primeiro
}
