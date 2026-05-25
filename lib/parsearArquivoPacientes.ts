import * as XLSX from "xlsx";
import { normalizarParaWhatsApp, validarTelefone } from "@/lib/formatarTelefone";

export interface PacienteImportado {
  nome: string;
  telefone: string;
  telefoneBruto: string;
  dadosIncompletos: boolean;
  ultimaConsulta: string | null;
  valorTicket: number | null;
  dataFuturaRejeitada?: boolean;
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

  // Formato DD/MM/AAAA ou MM/DD/AAAA (americano gerado pelo xlsx)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [a, b, ano] = str.split("/");
    const numA = parseInt(a);
    const numB = parseInt(b);
    // Se primeiro número > 12, só pode ser DD/MM
    // Se segundo número > 12, é MM/DD (americano)
    let dia, mes;
    if (numA > 12) {
      dia = a; mes = b;
    } else if (numB > 12) {
      dia = b; mes = a;
    } else {
      dia = a; mes = b; // assume brasileiro
    }
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

  // Formato DD/MM/AA (ano com 2 dígitos)
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const [dia, mes, ano] = str.split("/");
    const anoCompleto = parseInt(ano) > 50 ? `19${ano}` : `20${ano}`;
    return `${anoCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  // Formato mês/AA ou mês/AAAA por extenso (ex: fev/24, abril/23, jan/2024)
  const mesesPtBr: Record<string, string> = {
    jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
    jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
    janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05",
    junho: "06", julho: "07", agosto: "08", setembro: "09", outubro: "10",
    novembro: "11", dezembro: "12"
  };
  const matchMesAno = str.toLowerCase().match(/^([a-záãâàêéí]+)[\/\-\s](\d{2,4})$/);
  if (matchMesAno) {
    const mes = mesesPtBr[matchMesAno[1]];
    if (mes) {
      const ano = matchMesAno[2].length === 2
        ? (parseInt(matchMesAno[2]) > 50 ? `19${matchMesAno[2]}` : `20${matchMesAno[2]}`)
        : matchMesAno[2];
      return `${ano}-${mes}-01`;
    }
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

// Valida se a data não é futura — retorna null se for
function validarDataNaoFutura(dataISO: string | null): string | null {
  if (!dataISO) return null;
  const data = new Date(dataISO);
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (data > hoje) return null; // data futura — ignora
  return dataISO;
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
    cellDates: false,
    raw: true,  // ← lê tudo cru, inclusive datas como serial
  });

  // Pegar a primeira aba
  const nomePrimeiraAba = workbook.SheetNames[0];
  const planilha = workbook.Sheets[nomePrimeiraAba];

  // Converter para array de objetos
  const linhasRaw: any[] = XLSX.utils.sheet_to_json(planilha, {
    raw: false,
    defval: "",
  });

  // Detectar se tem cabeçalho reconhecível
  const primeiraChave = linhasRaw[0] ? normalizarChave(Object.keys(linhasRaw[0])[0]) : ""
  const temCabecalho = ["nome", "name", "paciente", "telefone", "fone", "celular"].includes(primeiraChave)

  // Se não tem cabeçalho, ler como array posicional (A=nome, B=telefone, C=data, D=valor)
  let linhas: any[]
  if (!temCabecalho && linhasRaw.length > 0) {
    const linhasArray: any[][] = XLSX.utils.sheet_to_json(planilha, {
      raw: true,        // ← pega serial do Excel, não converte para US
      defval: "",
      header: 1,
    }) as any[][]
    linhas = linhasArray
      .filter(row => {
        const telefone = String(row[1] || "").trim()
        return row.some(v => String(v).trim() !== "") && telefone !== ""
      })
      .map(row => ({
        nome: row[0] || "",
        telefone: row[1] || "",
        ultima_consulta: row[2] || "",
        valor_ticket: row[3] || "",
      }))
  } else {
    linhas = linhasRaw
  }

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
        linhaNormalizada["nome_completo"] ||
        linhaNormalizada["name"] ||
        linhaNormalizada["paciente"] ||
        linhaNormalizada["nome_paciente"] ||
        linhaNormalizada["nome_do_paciente"] ||
        "";

      // Buscar telefone — aceitar variações: telefone, fone, celular, whatsapp, tel
      const telefoneRaw =
        linhaNormalizada["telefone"] ||
        linhaNormalizada["fone"] ||
        linhaNormalizada["celular"] ||
        linhaNormalizada["whatsapp"] ||
        linhaNormalizada["tel"] ||
        "";

      // Normalizar telefone para WhatsApp
      const telefoneBruto = String(telefoneRaw).trim()
      const telefone = normalizarParaWhatsApp(telefoneBruto)
      const dadosIncompletos = !validarTelefone(telefoneBruto)

      // Buscar data — aceitar variações
      const dataRaw =
        linhaNormalizada["ultima_consulta"] ||
        linhaNormalizada["data"] ||
        linhaNormalizada["data_consulta"] ||
        linhaNormalizada["ultimo_atendimento"] ||
        linhaNormalizada["data_atendimento"] ||
        "";

      const ultimaConsulta = validarDataNaoFutura(normalizarData(dataRaw));

      // Buscar valor ticket — aceitar variações
      const valorRaw =
        linhaNormalizada["valor_ticket"] ||
        linhaNormalizada["valor"] ||
        linhaNormalizada["ticket"] ||
        linhaNormalizada["valor_ultima_consulta"] ||
        linhaNormalizada["valorultimaconsulta"] ||
        "";

      const valorTicket = valorRaw ? parseFloat(String(valorRaw).replace(/[^\d.,]/g, "").replace(",", ".")) || null : null;

      // Verificar se a data original existia mas foi rejeitada por ser futura
      const dataOriginal = normalizarData(dataRaw);
      const dataFuturaRejeitada = dataOriginal !== null && ultimaConsulta === null;

      return {
        nome: String(nome).trim(),
        telefone,
        telefoneBruto,
        dadosIncompletos: dadosIncompletos || dataFuturaRejeitada,
        ultimaConsulta,
        valorTicket,
        dataFuturaRejeitada, // flag extra para o resumo
      };
    });
}

