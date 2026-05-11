import * as XLSX from "xlsx";

export interface PacienteImportado {
  nome: string;
  telefone: string;
  ultimaConsulta: string | null;
}

// Converte data de qualquer formato para AAAA-MM-DD
function normalizarData(valor: any): string | null {
  if (!valor || String(valor).trim() === "") return null;

  // Se for número — serial do Excel (ex: 45123)
  if (typeof valor === "number" || /^\d{5}$/.test(String(valor))) {
    try {
      // Serial do Excel começa em 1 = 01/01/1900
      const dataBase = new Date(1899, 11, 30);
      const data = new Date(dataBase.getTime() + Number(valor) * 86400000);
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    } catch {
      return null;
    }
  }

  const str = String(valor).trim();

  // Formato DD/MM/AAAA
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [dia, mes, ano] = str.split("/");
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  // Formato DD-MM-AAAA
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    const [dia, mes, ano] = str.split("-");
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  // Formato MM/DD/AAAA (padrão americano)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const partes = str.split("/");
    return `${partes[2]}-${partes[0].padStart(2, "0")}-${partes[1].padStart(2, "0")}`;
  }

  // Já está no formato AAAA-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [ano, mes, dia] = str.split("-");
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  // Tentar parse genérico como último recurso
  try {
    const data = new Date(str);
    if (!isNaN(data.getTime())) {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    }
  } catch {
    return null;
  }

  return null;
}

// Normaliza o nome das colunas para encontrar independente de maiúsculas/acentos
function normalizarChave(chave: string): string {
  return chave
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9_]/g, "_");    // substitui caracteres especiais por _
}

export async function parsearArquivoPacientes(
  arquivo: File
): Promise<PacienteImportado[]> {
  const buffer = await arquivo.arrayBuffer();

  // Ler o arquivo com xlsx — funciona para .xlsx, .xls e .csv
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false, // Deixar como serial para normalizar depois
    raw: false,
  });

  // Pegar a primeira aba
  const nomePrimeiraAba = workbook.SheetNames[0];
  const planilha = workbook.Sheets[nomePrimeiraAba];

  // Converter para array de objetos
  const linhas: any[] = XLSX.utils.sheet_to_json(planilha, {
    raw: false,       // converter para string
    defval: "",       // valor padrão para células vazias
  });

  console.log(`📋 Total de linhas lidas: ${linhas.length}`);
  console.log("📋 Exemplo da primeira linha:", linhas[0]);

  return linhas
    .filter((linha) => {
      // Ignorar linhas completamente vazias
      const valores = Object.values(linha).filter((v) => String(v).trim() !== "");
      return valores.length > 0;
    })
    .map((linha) => {
      // Normalizar todas as chaves da linha para encontrar as colunas
      // independente de maiúsculas, acentos ou espaços
      const linhaNormalizada: Record<string, any> = {};
      for (const [chave, valor] of Object.entries(linha)) {
        linhaNormalizada[normalizarChave(chave)] = valor;
      }

      // Buscar nome — aceitar variações: nome, name, paciente, nome_paciente
      const nome =
        linhaNormalizada["nome"] ||
        linhaNormalizada["name"] ||
        linhaNormalizada["paciente"] ||
        linhaNormalizada["nome_paciente"] ||
        "";

      // Buscar telefone — aceitar variações: telefone, fone, celular, whatsapp, tel
      const telefoneRaw =
        linhaNormalizada["telefone"] ||
        linhaNormalizada["fone"] ||
        linhaNormalizada["celular"] ||
        linhaNormalizada["whatsapp"] ||
        linhaNormalizada["tel"] ||
        "";

      // Limpar telefone — só números
      const telefone = String(telefoneRaw).replace(/\D/g, "");

      // Buscar data — aceitar variações
      const dataRaw =
        linhaNormalizada["ultima_consulta"] ||
        linhaNormalizada["data"] ||
        linhaNormalizada["data_consulta"] ||
        linhaNormalizada["ultimo_atendimento"] ||
        linhaNormalizada["data_atendimento"] ||
        "";

      const ultimaConsulta = normalizarData(dataRaw);

      return { nome: String(nome).trim(), telefone, ultimaConsulta };
    });
}
