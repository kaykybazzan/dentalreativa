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
  tentativaAtual?: number;
  proximaTentativa?: number;
  diasSemResposta?: number | null;
}

// Calcula quantos dias se passaram desde a última consulta
export function calcularDiasSemConsulta(ultimaConsulta: string | Date): number {
  const hoje = new Date();
  const consulta = new Date(ultimaConsulta);
  const diffMs = hoje.getTime() - consulta.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDias;
}

// Configuração de risco da clínica — valores padrão usados se não vier do banco
export interface ConfigRisco {
  diasRiscoMedio: number
  diasRiscoAlto: number
  diasRiscoCritico: number
}

export const configRiscoPadrao: ConfigRisco = {
  diasRiscoMedio: 180,
  diasRiscoAlto: 270,
  diasRiscoCritico: 365,
}

// Classifica o nível de risco baseado nos dias sem consulta
export function classificarRisco(dias: number, config: ConfigRisco = configRiscoPadrao): NivelRisco {
  if (dias >= config.diasRiscoCritico) return "critico";
  if (dias >= config.diasRiscoAlto)    return "alto";
  if (dias >= config.diasRiscoMedio)   return "medio";
  return "ok";
}

// Aplica risco a um array de pacientes
// IMPORTANTE: exclui pacientes com dadosIncompletos = true
// IMPORTANTE: exclui pacientes com status = 'nao_contatar'
// IMPORTANTE: exclui pacientes com status = 'recuperado'
export function aplicarRisco(
  pacientes: any[],
  config: ConfigRisco = configRiscoPadrao
): PacienteComRisco[] {
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
        nivelRisco: classificarRisco(diasSemConsulta, config),
        valorTicket: parseFloat(p.valorUltimaConsulta ?? p.valorTicket ?? 0) || 0,
        status: p.status,
        dadosIncompletos: p.dadosIncompletos,
      };
    })
    .sort((a, b) => b.diasSemConsulta - a.diasSemConsulta); // mais urgentes primeiro
}
