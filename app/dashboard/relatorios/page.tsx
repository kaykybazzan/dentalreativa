"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  DollarSign,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Clock,
  Star,
  Lightbulb,
  Calendar,
  ChevronRight,
  Check,
  Reply,
  Users,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DateRangePicker } from "@/components/date-range-picker"
import { Sidebar } from "@/components/sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { gerarLinkWhatsApp, construirMensagem } from "@/lib/formatarTelefone"

type Period = "7d" | "30d" | "90d" | "custom"

export default function ReportsPage() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("reports")
  const [clinicName, setClinicName] = useState("")

  useEffect(() => {
    fetch("/api/clinica")
      .then((res) => res.json())
      .then((data) => { if (data?.nome) setClinicName(data.nome) })
      .catch(() => {})
  }, [])
  const [period, setPeriod] = useState<Period>("30d")
  const [exportSpinner, setExportSpinner] = useState<"pdf" | "csv" | null>(null)
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" })
  
  // API data state
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [exportando, setExportando] = useState(false)
  
  // Custom period picker
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customPeriodLabel, setCustomPeriodLabel] = useState<string | null>(null)
  const [customPeriodDates, setCustomPeriodDates] = useState<{ from: string; to: string } | null>(null)

  // Chart toggles
  const [showContatados, setShowContatados] = useState(true)
  const [showRecuperados, setShowRecuperados] = useState(true)

  // Message modal
  const [messageModal, setMessageModal] = useState<{ open: boolean; patientName: string; daysSince: number; phone: string } | null>(null)
  const [messageText, setMessageText] = useState("")



// useEffect 2 — relatórios (separado, sem nenhum outro dentro)
useEffect(() => {
  setCarregando(true)
  let url = `/api/relatorios?periodo=${period}`
  if (period === "custom" && customPeriodDates) {
    url += `&dataInicio=${customPeriodDates.from}&dataFim=${customPeriodDates.to}`
  }
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      setDados(data)
      setCarregando(false)
    })
    .catch(() => setCarregando(false))
}, [period, customPeriodDates])

  const handleLogout = () => {
    router.push("/")
  }

  const showToast = (message: string) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: "" }), 3000)
  }

  const handleExport = async (type: "pdf" | "csv") => {
    if (type === "csv") {
      setExportando(true)
      try {
        const res = await fetch("/api/relatorios/exportar")
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `dentalreativa-relatorio-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        showToast("Relatório CSV exportado com sucesso!")
      } catch (error) {
        console.error("Erro ao exportar:", error)
      } finally {
        setExportando(false)
      }
    } else {
      // PDF export not implemented
      setExportSpinner(type)
      setTimeout(() => {
        setExportSpinner(null)
        showToast("Exportação PDF não implementada")
      }, 1000)
    }
  }

  const openMessageModal = (patientName: string, daysSince: number, phone: string) => {
    const firstName = patientName.split(" ")[0]
    setMessageText(`Olá ${firstName}! Sentimos sua falta na clínica.\nJá faz ${daysSince} dias desde sua última consulta.\nPodemos agendar uma revisão para você?`)
    setMessageModal({ open: true, patientName, daysSince, phone })
  }

  const handleSendWhatsApp = () => {
    if (!messageModal) return
    const mensagem = construirMensagem(messageText, messageModal.patientName, clinicName)
    const link = gerarLinkWhatsApp(messageModal.phone, mensagem)
    if (!link) {
      alert(`Número inválido: ${messageModal.phone}`)
      return
    }
    window.open(link, "_blank")
    setMessageModal(null)
    showToast("Mensagem aberta no WhatsApp!")
  }

  const getDayColor = (days: number) => {
    if (days > 300) return "text-[#EF4444] font-bold"
    return "text-[#F59E0B] font-bold"
  }

  // Custom period picker ref
  const customPickerRef = useRef<HTMLDivElement>(null)

  const handleCustomPeriodApply = (from: string, to: string) => {
    // Format: DD/MM/AAAA -> DD/MM for display
    const fromShort = from.slice(0, 5)
    const toShort = to.slice(0, 5)
    setCustomPeriodLabel(`${fromShort} - ${toShort}`)
    setCustomPeriodDates({ from, to })
    setPeriod("custom")
    setShowCustomPicker(false)
  }

  const handleCustomPeriodCancel = () => {
    setShowCustomPicker(false)
  }

  // Close custom picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customPickerRef.current && !customPickerRef.current.contains(event.target as Node)) {
        setShowCustomPicker(false)
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCustomPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [showCustomPicker])

  return (
    <div className="flex h-screen bg-[#F8FAFC]">

      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onLogout={handleLogout}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-[#E2E8F0] px-7 py-4 shrink-0">
          {/* LINHA 1: Título + sino de notificações */}
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#1E293B]">Relatórios</h1>
          </div>

          {/* LINHA 2: Subtítulo + filtros de período */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#64748B]">Entenda o que está funcionando e onde está o dinheiro da sua clínica</p>

            {/* Period Filter */}
            <div className="flex items-center gap-1">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    period === p
                      ? "bg-[#0F3460] text-white"
                      : "bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
                </button>
              ))}
              <div className="relative" ref={customPickerRef}>
                <button
                  onClick={() => setShowCustomPicker(!showCustomPicker)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    period === "custom"
                      ? "bg-[#0F3460] text-white"
                      : "bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  {period === "custom" && customPeriodLabel ? customPeriodLabel : "Personalizado"}
                </button>

                {showCustomPicker && (
                  <div className="absolute right-0 top-full mt-2 z-[9999]">
                    <DateRangePicker
                      onApply={handleCustomPeriodApply}
                      onCancel={handleCustomPeriodCancel}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-7">

          {/* BLOCK 1 — Financial Results */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            {/* Receita Recuperada */}
            <div className="bg-[#0F3460] rounded-2xl p-7 text-white relative overflow-hidden" style={{ minHeight: 140 }}>
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-white/60 font-medium">Receita Recuperada</p>
                  <p className="text-[40px] font-bold leading-tight mt-2">
                    {carregando ? "..." : `R$ ${(dados?.metricas?.receitaRecuperada ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-[13px] text-white/70 mt-1">
                    {period === "7d" ? "nos últimos 7 dias" : period === "30d" ? "nos últimos 30 dias" : period === "90d" ? "nos últimos 90 dias" : customPeriodLabel ? `de ${customPeriodLabel}` : "no período selecionado"}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[12px] text-white/80 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {carregando ? "..." : `${dados?.funil?.recuperados ?? 0} via contato · ${dados?.metricas?.totalEspontaneos ?? 0} espontâneos`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Background circle icon */}
              <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full flex items-center justify-center pointer-events-none">
                <DollarSign className="h-12 w-12 text-white/20" />
              </div>
            </div>

            {/* Receita em Risco */}
            <div className="bg-[#7C2D12] rounded-2xl p-7 text-white relative overflow-hidden" style={{ minHeight: 140 }}>
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-white/60 font-medium">Receita em Risco</p>
                  <p className="text-[40px] font-bold leading-tight mt-2">
                    {carregando ? "..." : `R$ ${(dados?.metricas?.receitaEmRisco ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-[13px] text-white/70 mt-1">de pacientes não contatados</p>
                  <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                    <p className="text-[12px] text-white/80 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {carregando ? "..." : `${dados?.funil?.emRisco ?? 0} pacientes em risco`}
                    </p>
                    <p className="text-[12px] text-yellow-300 font-bold">Agir agora pode recuperar</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full flex items-center justify-center pointer-events-none">
                <AlertTriangle className="h-12 w-12 text-white/20" />
              </div>
            </div>
          </div>

          {/* BLOCK 2 — Insight + Ticket médio */}
          {!carregando && dados && (
            <div className="grid grid-cols-3 gap-4 mb-5">

              {/* Ticket médio por recuperado */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FDF4] shrink-0">
                  <TrendingUp className="h-6 w-6 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#64748B] font-medium tracking-wide">Ticket médio recuperado</p>
                  <p className="text-[22px] font-bold text-[#1E293B] leading-tight mt-0.5">
                    {(dados?.funil?.recuperados ?? 0) + (dados?.metricas?.totalEspontaneos ?? 0) > 0
                      ? `R$ ${(dados.metricas.receitaRecuperada / ((dados.funil.recuperados ?? 0) + (dados.metricas.totalEspontaneos ?? 0))).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">por paciente recuperado</p>
                </div>
              </div>

              {/* Tempo médio até recuperação */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] shrink-0">
                  <Clock className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#64748B] font-medium tracking-wide">Tempo médio p/ retorno</p>
                  <p className="text-[22px] font-bold text-[#1E293B] leading-tight mt-0.5">
                    {dados?.metricas?.tempoMedioRetorno > 0
                      ? `${dados.metricas.tempoMedioRetorno} dias`
                      : "—"}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">do 1º contato até voltar</p>
                </div>
              </div>

              {/* Insight automático */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-5 shadow-sm flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-[#3B82F6] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-[#1D4ED8] mb-1">Insight</p>
                  <p className="text-[13px] text-[#1E40AF] leading-relaxed">
                    {(() => {
                      const taxa = parseFloat(dados?.metricas?.taxaSucesso ?? "0")
                      const recuperados = dados?.metricas?.totalRecuperados ?? 0
                      const emRisco = dados?.metricas?.receitaEmRisco ?? 0
                      if (taxa >= 70) return `Sua taxa de ${taxa}% é excelente — acima da média do setor (45%). Continue contatando os ${dados?.funil?.emRisco ?? 0} pacientes restantes.`
                      if (taxa >= 45) return `Sua taxa de ${taxa}% está na média do setor. Você já recuperou ${recuperados} pacientes — ainda há R$ ${emRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em potencial.`
                      if (recuperados === 0) return `Você ainda não tem recuperações registradas. Comece pelos ${dados?.funil?.emRisco ?? 0} pacientes em risco — cada um vale em média R$ ${((dados?.metricas?.receitaEmRisco ?? 0) / Math.max(dados?.funil?.emRisco ?? 1, 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`
                      return `Você recuperou ${recuperados} pacientes até agora. Há R$ ${emRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ainda em risco esperando contato.`
                    })()}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* BLOCK 3 — Four Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {/* Card 1 - Contatados */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] mb-3">
                <MessageSquare className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <p className="text-[28px] font-bold text-[#1E293B] leading-tight">
                {carregando ? "..." : dados?.metricas?.totalContatados ?? 0}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">contatados no período</p>
              <p className="text-[12px] text-[#64748B] mt-2 mb-2">
                de {carregando ? "..." : dados?.funil?.emRisco ?? 0} em risco
              </p>
              <div className="w-full bg-[#E2E8F0] h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-[#3B82F6] h-full" 
                  style={{ 
                    width: carregando ? "0%" : ((dados?.metricas?.totalContatados ?? 0) / (dados?.funil?.emRisco ?? 1) * 100).toFixed(0) + "%" 
                  }} 
                />
              </div>
            </div>

            {/* Card 2 - Taxa de Sucesso */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FDF4] mb-3">
                <Reply className="h-5 w-5 text-[#10B981]" />
              </div>
              <p className="text-[28px] font-bold text-[#1E293B] leading-tight">
                {carregando ? "..." : dados?.metricas?.taxaSucesso ?? "0.0"}%
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">taxa de sucesso</p>
              <p className="text-[12px] text-[#64748B] mt-2 mb-2">
                {carregando ? "..." : `${dados?.funil?.recuperados ?? 0} de ${dados?.metricas?.totalContatados ?? 0} contatados`}
              </p>
              <div className="w-full bg-[#E2E8F0] h-1 rounded-full overflow-hidden">
                <div className="bg-[#10B981] h-full" style={{ width: carregando ? "0%" : dados?.metricas?.taxaSucesso ?? "0" }} />
              </div>
            </div>

            {/* Card 3 - Total Envios */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] mb-3">
                <Clock className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <p className="text-[28px] font-bold text-[#1E293B] leading-tight">
                {carregando ? "..." : dados?.metricas?.totalEnvios ?? 0}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">total de envios</p>
              <p className="text-[12px] text-[#64748B] mt-2">todas as tentativas</p>
            </div>

            {/* Card 4 - Total Pacientes */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] mb-3">
                <Star className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <p className="text-[20px] font-bold text-[#1E293B] leading-tight">
                {carregando ? "..." : dados?.metricas?.totalPacientes ?? 0}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">total de pacientes</p>
              <p className="text-[12px] text-[#10B981] font-medium mt-3">
                {carregando ? "..." : `${dados?.metricas?.totalAtivos ?? 0} ativos`}
              </p>
            </div>
          </div>

          {/* BLOCK 4 — Reactivation Funnel */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-5">
            <h3 className="text-[18px] font-bold text-[#1E293B]">Funil de reativação</h3>
            <p className="text-[13px] text-[#64748B] mt-0.5 mb-6">Veja onde os pacientes estão travando no processo</p>

            <div className="flex items-stretch gap-2">
              {/* Stage 1 */}
              <div className="flex-1 flex flex-col">
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 flex-1">
                  <p className="text-[11px] uppercase text-[#64748B] font-medium tracking-wide mb-2">Em Risco</p>
                  <p className="text-[32px] font-bold text-[#1E293B] leading-tight">
                    {carregando ? "..." : dados?.funil?.emRisco ?? 0}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-1">pacientes identificados</p>
                  <div className="w-full bg-[#FECACA] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#EF4444] h-full w-full" />
                  </div>
                </div>
                <p className="text-[12px] text-[#64748B] mt-2 text-center">
                  <span className="font-semibold text-[#0F3460]">
                    {carregando ? "..." : `${Math.min(((dados?.funil?.contatados ?? 0) / (dados?.funil?.emRisco ?? 1) * 100), 100).toFixed(0)}% contatados`}
                  </span>
                </p>
              </div>

              <div className="flex items-center pb-6">
                <ChevronRight className="h-5 w-5 text-[#94A3B8]" />
              </div>

              {/* Stage 2 */}
              <div className="flex-1 flex flex-col">
                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4 flex-1">
                  <p className="text-[11px] uppercase text-[#64748B] font-medium tracking-wide mb-2">Contatados</p>
                  <p className="text-[32px] font-bold text-[#1E293B] leading-tight">
                    {carregando ? "..." : dados?.funil?.contatados ?? 0}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-1">mensagens enviadas</p>
                  <div className="w-full bg-[#FDE68A] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#F59E0B] h-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <p className="text-[12px] text-[#64748B] mt-2 text-center">
                  <span className="font-semibold text-[#0F3460]">
                    {carregando ? "..." : `${dados?.metricas?.taxaSucesso ?? "0.0"}% responderam`}
                  </span>
                </p>
              </div>

              <div className="flex items-center pb-6">
                <ChevronRight className="h-5 w-5 text-[#94A3B8]" />
              </div>

              {/* Stage 3 — Recuperados */}
              <div className="flex-1 flex flex-col">
                <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-lg p-4 flex-1">
                  <p className="text-[11px] uppercase text-[#64748B] font-medium tracking-wide mb-2">Recuperados</p>
                  <p className="text-[32px] font-bold text-[#1E293B] leading-tight">
                    {carregando ? "..." : dados?.funil?.recuperados ?? 0}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-1">pacientes voltaram</p>
                  <div className="w-full bg-[#99F6E4] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#14B8A6] h-full"
                      style={{ width: carregando ? "0%" : `${Math.min(((dados?.funil?.recuperados ?? 0) / (dados?.funil?.contatados ?? 1)) * 100, 100).toFixed(0)}%` }} />
                  </div>
                </div>
                <div className="mt-2 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                  <span className="text-[12px] font-semibold text-[#10B981]">
                    R$ {carregando ? "..." : (dados?.metricas?.receitaRecuperada ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCK 5 — Evolution Chart */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#1E293B]">Evolução dos resultados</h3>
                <p className="text-[13px] text-[#64748B] mt-0.5">Acompanhe o progresso mês a mês</p>
              </div>
              {/* Line toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowContatados(!showContatados)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    showContatados
                      ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]"
                  }`}
                >
                  <span className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                  Contatados
                </button>
                <button
                  onClick={() => setShowRecuperados(!showRecuperados)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    showRecuperados
                      ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]"
                  }`}
                >
                  <span className="w-3 h-3 rounded-sm bg-[#10B981]" />
                  Recuperados
                </button>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={carregando ? [] : (dados?.evolucaoMensal ?? []).map((item: any) => ({
                  month: item.mes,
                  contatados: item.total_envios,
                  recuperados: item.recuperados
                }))}>
                  <defs>
                    <linearGradient id="gradRecuperados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      color: "#1E293B",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "contatados" ? "Contatados" : "Recuperados"
                    ]}
                  />
                  {showContatados && (
                    <Area
                      type="monotone"
                      dataKey="contatados"
                      name="contatados"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="none"
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#3B82F6" }}
                    />
                  )}
                  {showRecuperados && (
                    <Area
                      type="monotone"
                      dataKey="recuperados"
                      name="recuperados"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#gradRecuperados)"
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#10B981" }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                <span className="text-[12px] text-[#64748B]">Contatados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#10B981]" />
                <span className="text-[12px] text-[#64748B]">Recuperados</span>
              </div>
            </div>
          </div>

          
          {/* BLOCK 7 — Not Contacted Patients */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#1E293B]">Pacientes não contatados</h3>
                <p className="text-[13px] text-[#64748B] mt-0.5">Esses pacientes nunca foram contatados e podem voltar</p>
              </div>
              <span className="bg-[#FEE2E2] text-[#DC2626] text-sm font-semibold px-3 py-1.5 rounded-lg">
                {carregando ? "..." : `${dados?.pacientesEmRisco?.length ?? 0} pacientes · R$ ${(dados?.pacientesEmRisco?.reduce((acc: number, p: any) => acc + (p.valorTicket || 0), 0) ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em risco`}
              </span>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Nome</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Telefone</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Dias sem voltar</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Ticket médio</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#64748B]">Carregando...</td>
                  </tr>
                ) : (dados?.pacientesEmRisco ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#64748B]">Nenhum paciente em risco</td>
                  </tr>
                ) : (
                  (dados?.pacientesEmRisco ?? []).slice(0, 5).map((p: any, idx: number) => (
                    <tr key={p.id ?? idx} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold shrink-0 bg-[#3B82F6]`}>
                            {(p.nome ?? "??").substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#1E293B]">{p.nome ?? "-"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-[#1E293B]">{p.telefone ?? "-"}</td>
                      <td className={`py-3.5 px-4 text-sm ${getDayColor(p.diasSemConsulta ?? 0)}`}>
                        {p.diasSemConsulta ?? 0} dias
                      </td>
                      <td className="py-3.5 px-4 text-sm font-medium text-[#1E293B]">
                        R$ {(p.valorTicket ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <Button
                          onClick={() => router.push("/dashboard/automacao")}
                          className="bg-[#0F3460] hover:bg-[#0A2548] text-white text-xs h-8 px-3"
                        >
                          Ir para Central de Envios
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {(dados?.pacientesEmRisco?.length ?? 0) > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push("/dashboard/pacientes")}
                  className="text-sm font-semibold text-[#0F3460] hover:underline inline-flex items-center gap-1"
                >
                  Ver todos os {dados?.pacientesEmRisco?.length ?? 0} pacientes
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Message Modal */}
      <Dialog open={!!messageModal?.open} onOpenChange={() => setMessageModal(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <WhatsAppIcon className="h-6 w-6 text-[#25D366]" />
              <div>
                <DialogTitle className="text-base font-bold text-[#1E293B]">Enviar mensagem</DialogTitle>
                {messageModal && (
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Para: {messageModal.patientName} · {messageModal.daysSince} dias sem visita
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Mensagem</label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="h-32 resize-none"
                maxLength={160}
              />
              <p className="text-xs text-[#64748B] text-right mt-1">{messageText.length}/160</p>
            </div>
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3 flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-bold">i</span>
              </div>
              <p className="text-xs text-[#166534]">
                A mensagem será aberta no WhatsApp. Você poderá revisar antes de enviar.
              </p>
            </div>
            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={() => setMessageModal(null)} className="border-[#E2E8F0] text-[#64748B]">
                Cancelar
              </Button>
              <Button onClick={handleSendWhatsApp} className="bg-[#25D366] hover:bg-[#1ea952] text-white">
                <WhatsAppIcon className="h-4 w-4 mr-2" />
                Abrir no WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-6 right-6 bg-[#10B981] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C9.5 2 7.5 3.5 6.5 5.5C5.5 3.5 3.5 2 1 2V4C3.5 4 5 6 5 8C5 10 4 12 4 14C4 18 6 22 8 22C10 22 10.5 18 12 18C13.5 18 14 22 16 22C18 22 20 18 20 14C20 12 19 10 19 8C19 6 20.5 4 23 4V2C20.5 2 18.5 3.5 17.5 5.5C16.5 3.5 14.5 2 12 2Z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}
