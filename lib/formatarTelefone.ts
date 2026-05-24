/**
 * Normaliza número brasileiro para formato wa.me
 * Resolve o problema do 9º dígito automaticamente
 * Entrada: qualquer formato ((47) 9999-0000, 47999940000, 5547999940000, etc)
 * Saída: 5547999940000 (13 dígitos) pronto para wa.me
 */
export function normalizarParaWhatsApp(telefone: string): string {
  if (!telefone) return ""

  // Remove tudo que não é dígito
  let digits = telefone.replace(/\D/g, "")

  // Remove DDI 55 do início se já veio com ele
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2)
  }

  // Agora digits deve ter DDD + número local
  // Se tiver 10 dígitos = DDD (2) + número antigo (8) → adicionar 9 após DDD
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2)
    const numero = digits.slice(2)
    digits = ddd + "9" + numero
  }

  // Se tiver menos de 10 dígitos, número inválido — retorna vazio
  if (digits.length < 10) return ""

  // Retorna com DDI 55 na frente
  return "55" + digits
}

/**
 * Gera link wa.me completo com mensagem pré-preenchida
 * A mensagem já deve ter as variáveis [nome] e [clinica] substituídas
 */
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numero = normalizarParaWhatsApp(telefone)
  if (!numero) return ""
  const mensagemCodificada = encodeURIComponent(mensagem)
  return `https://wa.me/${numero}?text=${mensagemCodificada}` 
}

/**
 * Substitui variáveis [nome] e [clinica] na mensagem
 * Usa apenas o primeiro nome do paciente
 */
export function construirMensagem(
  template: string,
  nomePaciente: string,
  nomeClinica: string
): string {
  const primeiroNome = nomePaciente?.split(" ")[0] ?? nomePaciente
  return template
    .replace(/\[nome\]/gi, primeiroNome)
    .replace(/\[clinica\]/gi, nomeClinica)
}

/**
 * Formata número para exibição na tela: (47) 99999-0000
 * Usado para mostrar o número ao usuário antes de enviar
 */
export function formatarTelefoneExibicao(telefone: string): string {
  if (!telefone) return ""
  const digits = telefone.replace(/\D/g, "").replace(/^55/, "")

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` 
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` 
  }
  return telefone
}

/**
 * Valida se um número brasileiro é válido para WhatsApp
 * Retorna true se tiver DDD + 8 ou 9 dígitos
 */
export function validarTelefone(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, "").replace(/^55/, "")
  return digits.length === 10 || digits.length === 11
}
