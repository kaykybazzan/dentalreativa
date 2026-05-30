"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { 
  LayoutDashboard,
  Users,
  Zap,
  BarChart3,
  Settings,
  Search, 
  HelpCircle,
  TrendingUp,
  Clock,
  Send,
  AlertTriangle,
  Eye,
  Calendar,
  ChevronDown,
  MessageCircle,
  DollarSign,
  LogOut,
  Bell,
  CheckCircle,
  Check,
  X,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Input } from "@/components/ui/input"
import AlertaConfiguracao from "@/components/AlertaConfiguracao"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { DateRangePicker } from "@/components/date-range-picker"
import { gerarLinkWhatsApp, construirMensagem } from "@/lib/formatarTelefone"

type Patient = {
  id: number
  initials: string
  name: string
  phone: string
  lastVisit: string
  timeAway: string
  timeAwayMonths: number
  procedure: string
  action: "lembrete" | "agendamento" | "direto"
  status: string
  avatarColor: string
  daysSinceVisit: number
}

const samplePatients: Patient[] = [
  {
    id: 1,
    initials: "MS",
    name: "Maria Silva",
    phone: "(11) 99999-9999",
    lastVisit: "12/02/2024",
    timeAway: "5 meses",
    timeAwayMonths: 5,
    procedure: "Limpeza",
    action: "lembrete",
    status: "em_risco",
    avatarColor: "bg-[#3B82F6]",
    daysSinceVisit: 150
  },
  {
    id: 2,
    initials: "JS",
    name: "João Santos",
    phone: "(11) 98888-8888",
    lastVisit: "05/01/2024",
    timeAway: "6 meses",
    timeAwayMonths: 6,
    procedure: "Clareamento",
    action: "agendamento",
    status: "em_contato",
    avatarColor: "bg-[#10B981]",
    daysSinceVisit: 180
  },
  {
    id: 3,
    initials: "AL",
    name: "Ana Lima",
    phone: "(11) 97777-7777",
    lastVisit: "20/12/2023",
    timeAway: "7 meses",
    timeAwayMonths: 7,
    procedure: "Tratamento canal",
    action: "direto",
    status: "sem_resposta",
    avatarColor: "bg-[#8B5CF6]",
    daysSinceVisit: 210
  },
  {
    id: 4,
    initials: "RP",
    name: "Rafael Pereira",
    phone: "(11) 96666-6666",
    lastVisit: "15/01/2024",
    timeAway: "6 meses",
    timeAwayMonths: 6,
    procedure: "Implante",
    action: "agendamento",
    status: "recuperado",
    avatarColor: "bg-[#F59E0B]",
    daysSinceVisit: 180
  }
]

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  em_risco: { label: "Em risco", bgColor: "bg-[#FEF2F2]", textColor: "text-[#DC2626]" },
  ativo: { label: "Ativo", bgColor: "bg-[#F0FDF4]", textColor: "text-[#15803D]" },
  em_contato: { label: "Contatado", bgColor: "bg-[#EFF6FF]", textColor: "text-[#1D4ED8]" },
  recuperado: { label: "Recuperado", bgColor: "bg-[#F0FDF4]", textColor: "text-[#15803D]" },
  sem_resposta: { label: "Sem resposta", bgColor: "bg-[#FEFCE8]", textColor: "text-[#A16207]" },
  nao_contatar: { label: "Não contatar", bgColor: "bg-[#F8FAFC]", textColor: "text-[#475569]" },
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeNav, setActiveNav] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [dados, setDados] = useState<any>(null)
  const [todosPacientes, setTodosPacientes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [periodoSelecionado, setPeriodoSelecionado] = useState<"6m" | "1a" | "2a" | "custom">("6m")
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customLabel, setCustomLabel] = useState<string | null>(null)
  const [customDates, setCustomDates] = useState<{ from: string; to: string } | null>(null)
  const customPickerRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [badgeCount, setBadgeCount] = useState(0)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)

  const userName = session?.user?.name || "Usuário"
  const userEmail = session?.user?.email || ""
  const [clinicName, setClinicName] = useState("Carregando...")
  const [clinicCity, setClinicCity] = useState("")
  const userRole = "Administrador"
  const userInitial = userName[0]?.toUpperCase() || "U"

  useEffect(() => {
  // Aguarda a sessão terminar de carregar
  if (status === "loading") return

  // Se não estiver autenticado, não faz nada
  if (status !== "authenticated" || !session?.user) return

  const clinicaId = session.user.clinicaId

  // Evita rodar sem ID da clínica
  if (!clinicaId) {
    console.warn("clinicaId não encontrado")
    return
  }

  // Garante que só roda no browser
  if (typeof window !== "undefined") {
    const key = `onboarding_done_${clinicaId}`
    const jaViuBanner = localStorage.getItem(key)

    // Mostra apenas na primeira vez
    if (!jaViuBanner) {
    setShowWelcomeBanner(true)
    } else {
      setShowWelcomeBanner(false)
    }
  }

  setActiveNav("dashboard")

  fetch("/api/pacientes")
    .then((res) => res.json())
    .then((data) => setTodosPacientes(data))
    .catch(() => {})

  fetch("/api/notificacoes")
    .then((res) => res.json())
    .then((data) => {
      setNotificacoes(data.notificacoes || [])
      setBadgeCount(data.badgeCount || 0)
    })
    .catch(() => {})
  }, [status, session?.user?.clinicaId])

  useEffect(() => {
    setCarregando(true)
    let url = `/api/dashboard?periodo=${periodoSelecionado}`
    if (periodoSelecionado === "custom" && customDates) {
      url += `&dataInicio=${customDates.from}&dataFim=${customDates.to}`
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDados(data)
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [periodoSelecionado, customDates])

  const dadosGrafico = Array.isArray(dados?.grafico) ? dados.grafico : []

  const notifications: { id: number; type: string; text: string; time: string }[] = (
    dados?.notificacoes ?? []
  ).map((n: { tipo: string; texto: string; tempo: string }, i: number) => ({
    id: i,
    type: n.tipo === "risco" ? "alert" : "whatsapp",
    text: n.texto,
    time: n.tempo,
  }))

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".search-container")) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customPickerRef.current && !customPickerRef.current.contains(e.target as Node)) {
        setShowCustomPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (notifRef.current && !notifRef.current.contains(target) && !target.closest("#notif-button")) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    router.push("/")
  }

  const searchResults = searchQuery.trim() === ""
  ? []
  : todosPacientes.filter((p: any) =>
      p.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.telefone?.includes(searchQuery)
    )

  const handleWhatsApp = (phone: string, name: string) => {
    const mensagem = construirMensagem(
      "Olá [nome]! Sentimos sua falta na clínica. Podemos agendar uma revisão para você?",
      name,
      clinicName
    )
    const link = gerarLinkWhatsApp(phone, mensagem)
    if (!link) {
      alert(`Número inválido: ${phone}`)
      return
    }
    window.open(link, "_blank")
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "lembrete":
        return { label: "Enviar lembrete", className: "bg-[#DBEAFE] text-[#1E40AF]" }
      case "agendamento":
        return { label: "Oferecer agendamento", className: "bg-[#D1FAE5] text-[#065F46]" }
      case "direto":
        return { label: "Contato direto", className: "bg-[#FEE2E2] text-[#991B1B]" }
      default:
        return { label: "Lembrete", className: "bg-muted text-muted-foreground" }
    }
  }

  const getPriorityColor = (months: number) => {
    if (months > 6) return "bg-[#EF4444]" // vermelho
    if (months >= 4) return "bg-[#F59E0B]" // laranja
    return "bg-[#FBBF24]" // amarelo
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Pacientes", icon: Users },
    { id: "automation", label: "Central de Envios", icon: Zap },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
    { id: "settings", label: "Configurações", icon: Settings }
  ]

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar 
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onLogout={handleLogout}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1E293B]">Dashboard</h1>
            <p className="text-sm text-[#64748B]">Acompanhe pacientes em risco e recupere consultas perdidas.</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative search-container">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input 
                placeholder="Buscar pacientes..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchDropdown(e.target.value.trim() !== "")
                }}
                onFocus={() => setShowSearchDropdown(searchQuery.trim() !== "")}
                className="w-64 pl-9 h-9 bg-[#F8FAFC] border-[#E2E8F0] text-sm"
              />

              {/* Search Results Dropdown */}
              {showSearchDropdown && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-[#E2E8F0] shadow-lg z-9999 max-h-96 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-8 flex flex-col items-center gap-2">
                      <Search className="h-10 w-10 text-[#94A3B8]" />
                      <p className="text-sm text-[#64748B]">Nenhum paciente encontrado</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                      {searchResults.map((patient: any) => {
                      const config = statusConfig[patient.status] ?? { label: "Ativo", bgColor: "bg-[#F0FDF4]", textColor: "text-[#15803D]" }
                      const ultimaConsulta = patient.ultimaConsulta ? new Date(patient.ultimaConsulta) : null
                      const dias = ultimaConsulta
                        ? Math.floor((Date.now() - ultimaConsulta.getTime()) / (1000 * 60 * 60 * 24))
                        : 0
                      return (
                        <button
                          key={patient.id}
                          onClick={() => {
                            setSearchQuery("")
                            setShowSearchDropdown(false)
                            router.push(`/dashboard/pacientes`)
                          }}
                          className="w-full p-3 hover:bg-[#F8FAFC] transition-colors text-left flex items-center gap-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3B82F6] text-white text-sm font-semibold flex-shrink-0">
                            {patient.nome?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#1E293B]">{patient.nome}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} font-medium`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748B] mt-0.5">{dias} dias sem consulta</p>
                          </div>
                        </button>
                      )
                    })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sino de notificações */}
            <div className="relative">
              <button
              id="notif-button"
              onClick={() => {
                if (!showNotifications) {
                  fetch("/api/notificacoes")
                    .then(res => res.json())
                    .then(data => {
                      setNotificacoes(data.notificacoes || [])
                      setBadgeCount(data.badgeCount || 0)
                    })
                    .catch(() => {})
                }
                setShowNotifications(!showNotifications)
              }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
              >
                <Bell className="h-4 w-4" />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  ref={notifRef}
                  className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                    <p className="text-sm font-semibold text-[#1E293B]">Notificações</p>
                    <button onClick={() => setShowNotifications(false)}>
                      <X className="h-4 w-4 text-[#94A3B8] hover:text-[#1E293B]" />
                    </button>
                  </div>

                  <div className="max-h-[480px] overflow-y-auto">

                    {/* Resumo do dia */}
                    {notificacoes.find(n => n.tipo === "resumo") && (() => {
                      const resumo = notificacoes.find(n => n.tipo === "resumo")
                      return (
                        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">📌 Resumo do dia</p>
                          <div className="space-y-1">
                            <p className="text-sm text-[#1E293B]"><span className="font-semibold">{resumo.emRisco}</span> pacientes em risco</p>
                            <p className="text-sm text-[#1E293B]"><span className="font-semibold">{resumo.aguardandoContato}</span> aguardando contato</p>
                            <p className="text-sm font-semibold text-[#10B981]">R$ {resumo.receitaRecuperavel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recuperáveis</p>
                          </div>
                          <button
                            onClick={() => { router.push("/dashboard/automacao"); setShowNotifications(false) }}
                            className="mt-3 w-full h-8 rounded-lg bg-[#0F3460] text-white text-xs font-medium hover:bg-[#0A2540] transition-colors flex items-center justify-center gap-1"
                          >
                            Ir para Central de Envios <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })()}

                    {/* Críticos */}
                    {notificacoes.filter(n => n.tipo === "critico").length > 0 && (
                      <div className="border-b border-[#E2E8F0]">
                        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">🔴 Prioridade</p>
                        {notificacoes.filter(n => n.tipo === "critico").map((n) => (
                          <div key={n.id} className="px-4 py-3 hover:bg-[#FEF2F2] transition-colors cursor-pointer border-t border-[#F1F5F9]"
                            onClick={() => { router.push("/dashboard/automacao"); setShowNotifications(false) }}>
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-[#1E293B]">{n.pacienteNome}</p>
                                <p className="text-xs text-[#64748B]">{n.dias} dias sem consulta</p>
                                {n.valor > 0 && <p className="text-xs text-[#EF4444] font-medium mt-0.5">Potencial: R$ {n.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notificacoes.find(n => n.tipo === "critico_mais") && (() => {
                      const m = notificacoes.find(n => n.tipo === "critico_mais")
                      return (
                        <div className="px-4 pb-3 border-b border-[#E2E8F0]">
                          <button onClick={() => { router.push("/dashboard/automacao"); setShowNotifications(false) }}
                            className="text-xs text-[#EF4444] font-medium hover:underline">
                            + {m.restantes} outros críticos na fila →
                          </button>
                        </div>
                      )
                    })()}

                    {/* Follow-ups */}
                    {notificacoes.filter(n => n.tipo === "followup").length > 0 && (
                      <div className="border-b border-[#E2E8F0]">
                        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">🔵 Follow-up</p>
                        {notificacoes.filter(n => n.tipo === "followup").map((n) => (
                          <div key={n.id} className="px-4 py-3 hover:bg-[#EFF6FF] transition-colors cursor-pointer border-t border-[#F1F5F9]"
                            onClick={() => { router.push("/dashboard/automacao"); setShowNotifications(false) }}>
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-[#3B82F6] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-[#1E293B]">{n.pacienteNome}</p>
                                <p className="text-xs text-[#64748B]">Sem resposta há {n.diasSemResposta} dias · {n.tentativa + 1}ª tentativa disponível</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notificacoes.find(n => n.tipo === "followup_mais") && (() => {
                      const m = notificacoes.find(n => n.tipo === "followup_mais")
                      return (
                        <div className="px-4 pb-3 border-b border-[#E2E8F0]">
                          <button onClick={() => { router.push("/dashboard/automacao"); setShowNotifications(false) }}
                            className="text-xs text-[#3B82F6] font-medium hover:underline">
                            + {m.restantes} outros aguardando follow-up →
                          </button>
                        </div>
                      )
                    })()}

                    {/* Recuperados */}
                    {notificacoes.filter(n => n.tipo === "recuperado").length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">🟢 Resultados</p>
                        {notificacoes.filter(n => n.tipo === "recuperado").map((n) => (
                          <div key={n.id} className="px-4 py-3 hover:bg-[#F0FDF4] transition-colors cursor-pointer border-t border-[#F1F5F9]">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-[#1E293B]">{n.pacienteNome} voltou!</p>
                                {n.valor > 0 && <p className="text-xs text-[#10B981] font-semibold">+ R$ {n.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recuperados</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notificacoes.find(n => n.tipo === "recuperado_mais") && (() => {
                      const m = notificacoes.find(n => n.tipo === "recuperado_mais")
                      return (
                        <div className="px-4 pb-3">
                          <button onClick={() => { router.push("/dashboard/relatorios"); setShowNotifications(false) }}
                            className="text-xs text-[#10B981] font-medium hover:underline">
                            + {m.restantes} outros recuperados esta semana →
                          </button>
                        </div>
                      )
                    })()}

                    {/* Vazio */}
                    {notificacoes.filter(n => n.tipo !== "resumo").length === 0 && (
                      <div className="py-10 text-center">
                        <CheckCircle className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#1E293B]">Tudo em dia!</p>
                        <p className="text-xs text-[#64748B] mt-1">Nenhuma ação pendente agora.</p>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

          </div>     
        </header>

        

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          
          
          {showWelcomeBanner && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981]/10">
                  <Check className="h-5 w-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#166534]">Bem-vindo ao DentalReativa!</p>
                  <p className="text-xs text-[#166534]/80">Siga as instruções abaixo para começar.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWelcomeBanner(false)
                  const clinicaId = session?.user?.clinicaId
                  if (clinicaId) {
                    localStorage.setItem(`onboarding_done_${clinicaId}`, "true")
                  }
                }}
                className="text-[#64748B] hover:text-[#1E293B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <AlertaConfiguracao />
          
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6">
            {/* Alert Banner */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]/10">
              <TrendingUp className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <p className="text-sm text-[#3B82F6]">
              <span className="font-semibold text-[#1E40AF]">{carregando ? "..." : `Você tem ${dados?.cards?.emRisco ?? 0} pacientes em risco`}</span> com potencial de <span className="font-semibold text-[#1E40AF]">{carregando ? "..." : `R$ ${dados?.cards?.receitaEmRisco?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "0,00"}`}</span> recuperável. Comece pelos mais urgentes.
            </p>
          </div>

          {/* Metrics — 4 cards individuais */}
            <div className="grid grid-cols-4 gap-4 mb-7">

              {/* Card 1 — Pacientes em risco */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#64748B]">Pacientes em risco</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF2F2]">
                    <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                  </div>
                </div>
                <p className="text-3xl font-semibold text-[#1E293B] leading-none">
                  {carregando ? "..." : dados?.cards?.emRisco ?? 0}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444] font-medium">
                    pacientes identificados
                  </span>
                </div>
              </div>

              {/* Card 2 — Aguardando resposta */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#64748B]">Aguardando resposta</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF7ED]">
                    <Clock className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                </div>
                <p className="text-3xl font-semibold text-[#1E293B] leading-none">
                  {carregando ? "..." : dados?.cards?.aguardandoResposta ?? 0}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#D97706] font-medium">
                    sem retorno após contato
                  </span>
                </div>
              </div>

              {/* Card 3 — Contatados este mês */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#64748B]">Contatados este mês</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <Send className="h-4 w-4 text-[#3B82F6]" />
                  </div>
                </div>
                <p className="text-3xl font-semibold text-[#1E293B] leading-none">
                  {carregando ? "..." : dados?.cards?.recuperadosViaContato ?? 0}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-medium">
                    pacientes recuperados
                  </span>
                </div>
              </div>

              {/* Card 4 — Potencial recuperável */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#64748B]">Potencial recuperável</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDF4]">
                    <DollarSign className="h-4 w-4 text-[#10B981]" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-[#10B981] leading-none">
                  {carregando ? "..." : `R$ ${dados?.cards?.receitaEmRisco?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "0,00"}`}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D] font-medium">
                    valor em risco identificado
                  </span>
                </div>
              </div>

            </div>

            {/* Filtros de período */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setPeriodoSelecionado("6m")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoSelecionado === "6m"
                    ? "bg-[#0F3460] text-white"
                    : "bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E2E8F0]"
                }`}
              >
                6 meses
              </button>
              <button
                onClick={() => setPeriodoSelecionado("1a")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoSelecionado === "1a"
                    ? "bg-[#0F3460] text-white"
                    : "bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E2E8F0]"
                }`}
              >
                1 ano
              </button>
              <button
                onClick={() => setPeriodoSelecionado("2a")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoSelecionado === "2a"
                    ? "bg-[#0F3460] text-white"
                    : "bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E2E8F0]"
                }`}
              >
                2 anos
              </button>
              <div className="relative">
                <button
                  onClick={() => {
                    setPeriodoSelecionado("custom")
                    setShowCustomPicker(true)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodoSelecionado === "custom"
                      ? "bg-[#0F3460] text-white"
                      : "bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E2E8F0]"
                  }`}
                >
                  Personalizado
                </button>

                {showCustomPicker && (
                  <div
                    ref={customPickerRef}
                    className="absolute top-full left-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 z-50 w-72"
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1">De:</label>
                        <input
                          type="date"
                          id="custom-from"
                          className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[rgba(15,52,96,0.12)] focus:border-[#0F3460]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1">Até:</label>
                        <input
                          type="date"
                          id="custom-to"
                          className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[rgba(15,52,96,0.12)] focus:border-[#0F3460]"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            const fromInput = document.getElementById("custom-from") as HTMLInputElement
                            const toInput = document.getElementById("custom-to") as HTMLInputElement
                            const from = fromInput?.value
                            const to = toInput?.value

                            if (!from || !to) {
                              alert("Preencha ambas as datas")
                              return
                            }

                            if (from > to) {
                              alert("A data inicial deve ser anterior ou igual à data final")
                              return
                            }

                            setCustomDates({ from, to })
                            
                            const fromDate = new Date(from + "T00:00:00")
                            const toDate = new Date(to + "T00:00:00")
                            const label = `${fromDate.toLocaleDateString("pt-BR")} – ${toDate.toLocaleDateString("pt-BR")}`
                            setCustomLabel(label)
                            
                            setShowCustomPicker(false)
                          }}
                          className="flex-1 h-9 rounded-lg bg-[#0F3460] text-white text-sm font-medium hover:bg-[#0A2540] transition-colors"
                        >
                          Aplicar
                        </button>
                        <button
                          onClick={() => setShowCustomPicker(false)}
                          className="flex-1 h-9 rounded-lg border border-[#E2E8F0] text-[#64748B] text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {periodoSelecionado === "custom" && customLabel && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-[#64748B]">{customLabel}</span>
                  <button
                    onClick={() => {
                      setCustomDates(null)
                      setCustomLabel(null)
                      setPeriodoSelecionado("6m")
                    }}
                    className="text-[#64748B] hover:text-[#1E293B] transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="h-64">
              {carregando ? (
                <div className="h-full flex items-center justify-center text-sm text-[#64748B]">
                  Carregando gráfico...
                </div>
              ) : dadosGrafico.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[#64748B]">
                  Nenhum dado de pacientes no período selecionado.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-[#64748B]">
                        {value === "emRisco" ? "Em risco" : "Recuperados"}
                      </span>
                    )}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="emRisco" 
                    name="emRisco"
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#3B82F6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recuperados" 
                    name="recuperados"
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Patients Table - Full Width */}
          <div className="bg-white rounded-xl border border-[#E2E8F0]">
            <div className="p-6 border-b border-[#E2E8F0]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-medium text-[#1E293B]">Pacientes que precisam de contato</h3>
                  <p className="text-sm text-[#64748B] mt-0.5">
                    Envie mensagens rápidas pelo WhatsApp para trazer esses pacientes de volta.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push("/dashboard/pacientes")}
                  className="text-sm border-[#0F3460] text-[#0F3460] hover:bg-[#0F3460] hover:text-white"
                >
                  Ver todos os pacientes
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left text-xs font-medium text-[#64748B] px-6 py-3">Nome</th>
                    <th className="text-left text-xs font-medium text-[#64748B] px-6 py-3">Dias sem consulta</th>
                    <th className="text-left text-xs font-medium text-[#64748B] px-6 py-3">Nível de risco</th>
                    <th className="text-left text-xs font-medium text-[#64748B] px-6 py-3">Valor ticket</th>
                    <th className="text-left text-xs font-medium text-[#64748B] px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {dados?.urgentes?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[#1E293B]">{p.nome}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#64748B]">{p.diasSemConsulta} dias</span>
                      </td>
                      <td className="px-6 py-4">
                        <span style={{ color: p.nivelRisco === "critico" ? "#EF4444" : "#F59E0B" }}>
                          {p.nivelRisco === "critico" ? "🔴 Crítico" : "🟡 Alto"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#64748B]">R$ {p.valorTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleWhatsApp(p.telefone, p.nome)}
                            className="p-2 rounded-lg hover:bg-[#D1FAE5] transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <WhatsAppIcon className="h-5 w-5 text-[#10B981]" />
                          </button>
                          <button 
                            onClick={() => router.push(`/dashboard/pacientes`)}
                            className="p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                            title="Ver perfil"
                          >
                            <Eye className="h-5 w-5 text-[#64748B]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] flex justify-center">
              <button 
                onClick={() => router.push("/dashboard/pacientes")}
                className="text-sm text-[#0F3460] font-medium hover:underline flex items-center gap-1 transition-colors"
              >
                Ver mais pacientes
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}


function DollarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  )
}

function MessageClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 10v2l1.5 1" />
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
