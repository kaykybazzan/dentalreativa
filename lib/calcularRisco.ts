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

export function calcularDiasSemConsulta(ultimaConsulta: string | Date): number {
  const hoje = new Date()
  const hojeData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  let consultaData: Date
  if (typeof ultimaConsulta === "string") {
    // String "YYYY-MM-DD" — parseia manualmente para evitar interpretação UTC
    const [ano, mes, dia] = ultimaConsulta.slice(0, 10).split("-").map(Number)
    consultaData = new Date(ano, mes - 1, dia)
  } else {
    consultaData = new Date(ultimaConsulta.getFullYear(), ultimaConsulta.getMonth(), ultimaConsulta.getDate())
  }

  const diffMs = hojeData.getTime() - consultaData.getTime()
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDias)
}


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

export function classificarRisco(dias: number, config: ConfigRisco = configRiscoPadrao): NivelRisco {
  if (dias >= config.diasRiscoCritico) return "critico";
  if (dias >= config.diasRiscoAlto)    return "alto";
  if (dias >= config.diasRiscoMedio)   return "medio";
  return "ok";
}

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
    .sort((a, b) => b.diasSemConsulta - a.diasSemConsulta);
}