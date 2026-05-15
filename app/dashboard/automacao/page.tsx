"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  Zap,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Search,
  CheckCircle,
  Calendar,
  Eye,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

interface PacienteFila {
  id: string
  nome: string
  telefone: string
  ultimaConsulta: string
  diasSemConsulta: number
  nivelRisco: string
  valorTicket: number
  status: string
  // UI properties
  avatar: string
  avatarColor: string
  name: string
  phone: string
  lastVisit: string
  daysSince: number
  attempt: string
  attemptLabel: string
  attemptBg: string
  attemptText: string
  message: string
  procedure: string
  estimatedValue: number
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Pacientes", icon: Users },
  { id: "automation", label: "Central de Envios", icon: Zap },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "settings", label: "Configurações", icon: Settings },
]

const notifications = [
  { id: 1, type: "alert", text: "5 novos pacientes em risco hoje", time: "Há 2 horas" },
  { id: 2, type: "whatsapp", text: "Maria Silva respondeu sua mensagem", time: "Há 3 horas" },
  { id: 3, type: "calendar", text: "João Santos confirmou consulta", time: "Há 5 horas" },
]

export default function AutomacaoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [clinicName, setClinicName] = useState("")
  const [clinicCity, setClinicCity] = useState("")
  const [userName, setUserName] = useState("")
  const [activeNav, setActiveNav] = useState("automation")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  // Dados reais da fila
  const [fila, setFila] = useState<PacienteFila[]>([])
  const [carregando, setCarregando] = useState(true)
  // Controle de quais botões estão desabilitados após clique
  const [enviando, setEnviando] = useState<Record<string, boolean>>({})
  // Controle de quais pacientes já foram enviados nessa sessão
  const [enviados, setEnviados] = useState<Record<string, boolean>>({})
  // Mapeamento de número de tentativas por paciente
  const [tentativas, setTentativas] = useState<Record<string, number>>({})

  // Mensagens (somente leitura)
  const [message1] = useState("Olá [nome]! Já faz um tempinho desde sua última consulta na [clinica]. Que tal agendar uma revisão?")
  const [message2] = useState("[nome], temos horários disponíveis essa semana na [clinica]. Posso reservar um para você?")
  const [message3] = useState("Oi [nome]! Queremos ter certeza de que está tudo bem. Podemos ajudar com algo? Entre em contato com a [clinica].")

  // UI states
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null)

  // Filtros rápidos
  const [sortBy, setSortBy] = useState<"urgency" | "value">("urgency")
  const [showOnlyUnsent, setShowOnlyUnsent] = useState(false)

  // Painel de filtros avançados
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Filtros internos (dentro do painel — ainda não aplicados)
  const [filterAttempt, setFilterAttempt] = useState<"all" | "1" | "2" | "3">("all")
  const [filterProcedures, setFilterProcedures] = useState<string[]>([])
  const [filterMinValue, setFilterMinValue] = useState("")
  const [filterMaxValue, setFilterMaxValue] = useState("")
  const [filterMinDays, setFilterMinDays] = useState("")

  // Filtros ativos (aplicados ao clicar em "Aplicar")
  const [activeFilterAttempt, setActiveFilterAttempt] = useState<"all" | "1" | "2" | "3">("all")
  const [activeFilterProcedures, setActiveFilterProcedures] = useState<string[]>([])
  const [activeFilterMinValue, setActiveFilterMinValue] = useState("")
  const [activeFilterMaxValue, setActiveFilterMaxValue] = useState("")
  const [activeFilterMinDays, setActiveFilterMinDays] = useState("")

  const allProcedures = Array.from(new Set(fila.map(p => p.procedure).filter(Boolean)))

  const activeFiltersCount = [
    activeFilterAttempt !== "all",
    activeFilterProcedures.length > 0,
    activeFilterMinValue !== "",
    activeFilterMaxValue !== "",
    activeFilterMinDays !== "",
    showOnlyUnsent,
  ].filter(Boolean).length

  fetch("/api/clinica")
  .then((res) => res.json())
  .then((data) => {
    if (data?.nome) setClinicName(data.nome)
    if (data?.cidade) setClinicCity(data.cidade)
  })
  .catch(() => {})

  const filteredAndSortedPatients = fila
    .filter((p) => {
      const enviado = enviados[p.id]
      if (showOnlyUnsent && enviado) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "urgency") return b.diasSemConsulta - a.diasSemConsulta
      if (sortBy === "value") return b.valorTicket - a.valorTicket
      return 0
    })

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("onboarding_done") !== "true") {
        router.push("/onboarding")
        return
      }
      setActiveNav("automation")
      
      // Use session data for clinic info
      if (session?.user?.name) setUserName(session.user.name?.split(" ")?.[0] ?? session.user.name)
      if (session?.user?.clinicaNome) setClinicName(session.user.clinicaNome)
      
          fetch("/api/clinica")
      .then((res) => res.json())
      .then((data) => {
        if (data?.nome) setClinicName(data.nome)
        if (data?.cidade) setClinicCity(data.cidade)
      })
      .catch(() => {})

          fetch("/api/clinica")
      .then((res) => res.json())
      .then((data) => {
        if (data?.nome) setClinicName(data.nome)
        if (data?.cidade) setClinicCity(data.cidade)
      })
      .catch(() => {})

      // Buscar nome real da clínica do banco — sempre sobrescreve o localStorage
      fetch("/api/clinica")
        .then((res) => res.json())
        .then((data) => {
          if (data?.nome) setClinicName(data.nome)
          if (data?.cidade) setClinicCity(data.cidade)
        })
        .catch(() => {
          // manter o valor do localStorage como fallback
        })
      
      carregarFila()
    }
  }, [router, session])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("#user-menu-button") && !target.closest("#user-menu-dropdown")) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("onboarding_done")
    localStorage.removeItem("onboarding_step")
    localStorage.removeItem("signup_data")
    router.push("/")
  }

  const carregarFila = async () => {
    setCarregando(true)
    try {
      const response = await fetch("/api/pacientes/fila")
      if (response.ok) {
        const data = await response.json()
        // Map database fields to UI fields
        const mappedFila = await Promise.all(data.map(async (p: any) => {
          const avatarColors = ["bg-[#3B82F6]", "bg-[#10B981]", "bg-[#8B5CF6]", "bg-[#F59E0B]", "bg-[#EF4444]"]
          const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)]
          const initials = p.nome?.split(" ")?.map((n: string) => n?.[0])?.join("")?.slice(0, 2)?.toUpperCase() ?? ""
          const ultimaConsulta = p.ultimaConsulta ? new Date(p.ultimaConsulta) : null
          const lastVisit = ultimaConsulta ? ultimaConsulta.toLocaleDateString?.('pt-BR') ?? '' : ''
          
          // Fetch attempt number for this patient
          const tentativaRes = await fetch(`/api/envios/mensagem?pacienteId=${p.id}`)
          const { tentativa } = await tentativaRes.json()
          
          const attemptNum = tentativa || 1
          const attemptLabel = `${attemptNum}ª`
          const attemptBg = attemptNum === 1 ? "bg-[#EFF6FF]" : attemptNum === 2 ? "bg-[#FFFBEB]" : "bg-[#FEF2F2]"
          const attemptText = attemptNum === 1 ? "text-[#1D4ED8]" : attemptNum === 2 ? "text-[#92400E]" : "text-[#DC2626]"
          
          return {
            ...p,
            avatar: initials,
            avatarColor,
            name: p.nome,
            phone: p.telefone,
            lastVisit,
            daysSince: p.diasSemConsulta,
            attempt: attemptNum.toString(),
            attemptLabel,
            attemptBg,
            attemptText,
            message: "Mensagem será carregada ao enviar",
            procedure: "Consulta",
            estimatedValue: p.valorTicket,
          }
        }))
        setFila(mappedFila)
      }
    } catch (error) {
      console.error("Erro ao carregar fila:", error)
    } finally {
      setCarregando(false)
    }
  }

  const handleEnviarWhatsApp = async (paciente: PacienteFila) => {
    // Desabilitar botão imediatamente para evitar duplo clique
    setEnviando((prev) => ({ ...prev, [paciente.id]: true }))

    try {
      // 1. Buscar a mensagem correta para esse paciente
      const msgRes = await fetch(`/api/envios/mensagem?pacienteId=${paciente.id}`)
      const { mensagem, tentativa } = await msgRes.json()

      // 2. Gerar o link do WhatsApp
      // Telefone já está normalizado (só números) — adicionar 55 se não tiver
      const telefone = paciente.telefone.startsWith("55")
        ? paciente.telefone
        : `55${paciente.telefone}`

      const linkWhatsApp = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`

      // 3. Abrir o WhatsApp em nova aba
      window.open(linkWhatsApp, "_blank")

      // 4. Registrar o envio no banco
      await fetch("/api/envios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId: paciente.id }),
      })

      // 5. Marcar como enviado nessa sessão
      setEnviados((prev) => ({ ...prev, [paciente.id]: true }))
      setTentativas((prev) => ({ ...prev, [paciente.id]: tentativa }))

    } catch (error) {
      console.error("Erro ao enviar:", error)
      // Reabilitar botão em caso de erro
      setEnviando((prev) => ({ ...prev, [paciente.id]: false }))
    }
  }

  const handlePacienteVoltou = async (paciente: PacienteFila) => {
    try {
      await fetch("/api/envios/recuperado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId: paciente.id,
          valorRecuperado: paciente.valorTicket,
        }),
      })

      // Remover da fila após marcar como recuperado
      setFila((prev) => prev.filter((p) => p.id !== paciente.id))
    } catch (error) {
      console.error("Erro ao marcar como recuperado:", error)
    }
  }

  const handleNavigation = (navId: string) => {
    setActiveNav(navId)
    if (navId === "dashboard") router.push("/dashboard")
    else if (navId === "patients") router.push("/dashboard/pacientes")
    else if (navId === "automation") router.push("/dashboard/automacao")
    else if (navId === "reports") router.push("/dashboard/relatorios")
    else if (navId === "settings") router.push("/dashboard/configuracoes")
  }

  const getDaysSinceColor = (daysSince: number) => {
    if (daysSince > 180) return "text-[#EF4444]"
    if (daysSince >= 120) return "text-[#F59E0B]"
    return "text-[#64748B]"
  }

  const handleApplyFilters = () => {
    setActiveFilterAttempt(filterAttempt)
    setActiveFilterProcedures(filterProcedures)
    setActiveFilterMinValue(filterMinValue)
    setActiveFilterMaxValue(filterMaxValue)
    setActiveFilterMinDays(filterMinDays)
    setShowFilterPanel(false)
  }

  const handleClearFilters = () => {
    setFilterAttempt("all")
    setFilterProcedures([])
    setFilterMinValue("")
    setFilterMaxValue("")
    setFilterMinDays("")
    setActiveFilterAttempt("all")
    setActiveFilterProcedures([])
    setActiveFilterMinValue("")
    setActiveFilterMaxValue("")
    setActiveFilterMinDays("")
    setShowOnlyUnsent(false)
    setSortBy("urgency")
  }

  const toggleProcedure = (proc: string) => {
    setFilterProcedures(prev =>
      prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]
    )
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">

      {/* Sidebar */}
      <aside className="w-60 bg-[#0F3460] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="DentalReativa" width={40} height={40} className="object-contain brightness-0 invert" />
            <span className="text-lg font-semibold text-white">DentalReativa</span>
          </div>
        </div>

        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/10 text-white border-l-[3px] border-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-white/10">
          
          {/* Bloco da clínica */}
          <div className="flex items-center justify-between px-3 py-2.5 mb-1">
            <div className="text-left">
              <p className="text-sm font-medium text-white">{clinicName}</p>
              <p className="text-xs text-white/60">{clinicCity}</p>
            </div>
          </div>

          {/* Bloco do usuário com dropdown */}
          <div className="relative">
            <button
              id="user-menu-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-sm font-medium shrink-0">
                {userName?.[0]?.toUpperCase() ?? ""}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{userName ?? "Usuário"}</p>
                <p className="text-xs text-white/60">Administrador</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div
                id="user-menu-dropdown"
                className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden z-50"
              >
                {/* Cabeçalho do dropdown */}
                <div className="px-4 py-3 border-b border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#1E293B] truncate">{userName ?? "Usuário"}</p>
                  <p className="text-xs text-[#64748B] truncate">{clinicName ?? "Clínica"}</p>
                </div>

                {/* Opção: Meu perfil */}
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    setShowProfileModal(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <svg className="h-4 w-4 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Meu perfil
                </button>

                {/* Opção: Configurações da clínica */}
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    router.push("/dashboard/configuracoes")
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <svg className="h-4 w-4 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Configurações da clínica
                </button>

                {/* Divisor */}
                <div className="border-t border-[#E2E8F0]" />

                {/* Opção: Sair */}
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>

              </div>
            )}
          </div>

        </div>
      </aside>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-[#1E293B]">Meu perfil</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-[#64748B] hover:text-[#1E293B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F3460] text-white text-2xl font-bold mb-3">
                {userName?.[0]?.toUpperCase() ?? ""}
              </div>
              <p className="text-base font-semibold text-[#1E293B]">{userName ?? "Usuário"}</p>
              <p className="text-sm text-[#64748B]">Administrador</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  defaultValue={userName ?? ""}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] bg-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Clínica
                </label>
                <input
                  type="text"
                  value={clinicName ?? ""}
                  readOnly
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] bg-[#F8FAFC]"
                />
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full h-10 mt-6 rounded-lg bg-[#0F3460] text-white text-sm font-medium hover:bg-[#0A2540] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-[#1E293B]">Central de Envios</h1>
            <p className="text-xs text-[#64748B]">Veja quem precisa de contato hoje e envie mensagens com 1 clique pelo WhatsApp.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                placeholder="Buscar pacientes..."
                className="h-9 w-56 pl-9 pr-3 rounded-lg border border-[#E2E8F0] text-sm bg-[#F8FAFC] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[rgba(15,52,96,0.12)] focus:border-[#0F3460]"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#EF4444]" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
                  <div className="p-3 border-b border-[#E2E8F0]">
                    <p className="text-sm font-semibold text-[#1E293B]">Notificações</p>
                  </div>
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] cursor-pointer">
                      <p className="text-sm text-[#1E293B]">{n.text}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto p-6">

          {/* FILA DO DIA */}
          <div className="mb-6">

            {/* Título + badge */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">Fila de hoje</h2>
                <p className="text-sm text-[#64748B]">Pacientes identificados pelo sistema para contato agora</p>
              </div>
              <span className="inline-block bg-[#0F3460] text-white px-4 py-2 rounded-full text-sm font-medium">
                {carregando ? "..." : `${fila.length} pacientes aguardando contato`}
              </span>
            </div>

            {/* Barra de filtros rápidos */}
            <div className="flex items-center gap-3 flex-wrap mb-4">

              {/* Botão Filtros avançados */}
              <button
                onClick={() => setShowFilterPanel(true)}
                className={`flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  activeFiltersCount > 0
                    ? "bg-[#0F3460] text-white border-[#0F3460]"
                    : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="bg-white text-[#0F3460] text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Ordenação */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "urgency" | "value")}
                className="h-9 pl-3 pr-8 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] appearance-none cursor-pointer"
              >
                <option value="urgency">Mais urgente primeiro</option>
                <option value="value">Maior valor primeiro</option>
              </select>

              {/* Toggle apenas não enviados */}
              <button
                onClick={() => setShowOnlyUnsent(!showOnlyUnsent)}
                className={`flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  showOnlyUnsent
                    ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                    : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showOnlyUnsent ? "bg-[#1D4ED8]" : "bg-[#94A3B8]"}`} />
                Apenas não enviados
              </button>

              {/* Limpar filtros */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-[#EF4444] hover:underline ml-auto"
                >
                  Limpar todos os filtros
                </button>
              )}

            </div>

            {/* Tabela */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">

              {/* Header da tabela */}
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-3 grid grid-cols-8 gap-3 text-xs uppercase text-[#64748B] font-medium tracking-wider">
                <div className="col-span-2">Nome</div>
                <div>Última consulta</div>
                <div>Dias sem voltar</div>
                <div>Tentativa</div>
                <div>Procedimento</div>
                <div>Valor est.</div>
                <div>Ação</div>
              </div>

              {/* Linhas */}
              {filteredAndSortedPatients.map((patient) => (
                <div key={patient.id}>
                  <div className="border-b border-[#F1F5F9] px-5 py-4 grid grid-cols-8 gap-3 items-center hover:bg-[#F8FAFC] transition-colors">

                    {/* Nome */}
                    <div className="col-span-2 flex items-center gap-3">
                      <div className={`${patient.avatarColor ?? "bg-[#3B82F6]"} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                        {patient.avatar ?? ""}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1E293B]">{patient.name ?? "-"} <span className="text-xs font-normal text-[#64748B]">({patient.attemptLabel ?? "1ª"} tentativa)</span></p>
                        {patient.attempt === "3" && (
                          <p className="text-xs text-[#EF4444] font-medium">⚠️ Última chance</p>
                        )}
                        <p className="text-xs text-[#64748B]">{patient.phone ?? "-"}</p>
                      </div>
                    </div>

                    {/* Última consulta */}
                    <div>
                      <p className="text-sm text-[#64748B]">{patient.lastVisit ?? "-"}</p>
                    </div>

                    {/* Dias sem voltar */}
                    <div>
                      <p className={`text-sm font-bold ${getDaysSinceColor(patient.daysSince ?? 0)}`}>
                        {patient.daysSince ?? 0} dias
                      </p>
                    </div>

                    {/* Tentativa */}
                    <div>
                      <span className={`inline-block ${patient.attemptBg ?? "bg-[#EFF6FF]"} ${patient.attemptText ?? "text-[#1D4ED8]"} px-2 py-1 rounded text-xs font-medium`}>
                        {patient.attemptLabel ?? "1ª"} tentativa
                      </span>
                    </div>

                    {/* Procedimento */}
                    <div>
                      <p className="text-xs text-[#64748B]">{patient.procedure ?? "-"}</p>
                    </div>

                    {/* Valor estimado */}
                    <div>
                      <p className="text-xs font-medium text-[#1E293B]">
                        {patient.estimatedValue?.toLocaleString?.('pt-BR', { style: 'currency', currency: 'BRL' }) ?? "R$ 0,00"}
                      </p>
                    </div>

                    {/* Ação */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedMessage(expandedMessage === patient.id ? null : patient.id)}
                        className="text-[#94A3B8] hover:text-[#64748B] transition-colors"
                        title="Ver mensagem"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {enviados[patient.id] ? (
                        <>
                          <div className="flex items-center gap-1 text-[#10B981]">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Enviado ✓</span>
                          </div>
                          <Button
                            onClick={() => handlePacienteVoltou(patient)}
                            className="bg-[#10B981] hover:bg-[#059669] text-white text-xs h-8 px-3 flex items-center gap-1.5 rounded-lg"
                          >
                            Paciente voltou
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleEnviarWhatsApp(patient)}
                          disabled={enviando[patient.id] || enviados[patient.id]}
                          className="bg-[#25D366] hover:bg-[#1fad52] text-white text-xs h-8 px-3 flex items-center gap-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.523 5.855L.057 23.428a.75.75 0 0 0 .916.916l5.573-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.696-.534-5.218-1.457l-.374-.223-3.879 1.021 1.021-3.879-.223-.374A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                          </svg>
                          Enviar
                        </Button>
                      )}
                    </div>

                  </div>

                  {/* Mensagem expandida */}
                  {expandedMessage === patient.id && (
                    <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-3">
                      <p className="text-xs text-[#64748B] mb-1 font-medium">Mensagem que será enviada:</p>
                      <p className="text-sm text-[#1E293B]">{patient.message ?? "Carregando mensagem..."}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Estado vazio */}
              {filteredAndSortedPatients.length === 0 && (
                <div className="py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9] mx-auto mb-3">
                    <SlidersHorizontal className="h-6 w-6 text-[#94A3B8]" />
                  </div>
                  <p className="text-sm font-medium text-[#1E293B]">Nenhum paciente encontrado</p>
                  <p className="text-xs text-[#64748B] mt-1">Tente ajustar ou limpar os filtros</p>
                  <button
                    onClick={handleClearFilters}
                    className="mt-3 text-sm text-[#0F3460] hover:underline font-medium"
                  >
                    Limpar todos os filtros
                  </button>
                </div>
              )}

              {/* Rodapé */}
              <div className="bg-white px-5 py-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <p className="text-xs text-[#64748B]">
                  Mostrando {filteredAndSortedPatients.length} de {fila.length} pacientes
                </p>
                <Button variant="outline" className="text-[#0F3460] border-[#0F3460] hover:bg-[#0F3460] hover:text-white text-xs h-8">
                  Ver todos os {fila.length} pacientes
                </Button>
              </div>

            </div>
          </div>

          {/* MENSAGENS CONFIGURADAS */}
          <div className="mb-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#1E293B]">Mensagens configuradas</h2>
              <p className="text-sm text-[#64748B]">
                Edite os textos em{" "}
                <button
                  onClick={() => router.push("/dashboard/configuracoes")}
                  className="text-[#0F3460] hover:underline font-medium"
                >
                  Configurações
                </button>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* 1ª tentativa */}
              <div className="bg-white border border-l-4 border-l-[#3B82F6] border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <span className="inline-block bg-[#EFF6FF] text-[#1D4ED8] px-3 py-1 rounded-full text-xs font-medium mb-2">1ª tentativa</span>
                <p className="text-xs text-[#64748B] italic mb-3">Enviar assim que entrar na fila</p>
                <Textarea value={message1} readOnly className="w-full h-24 text-sm border-[#E2E8F0] bg-[#F8FAFC] resize-none mb-2 cursor-default" />
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">{message1.length}/500</span>
                </div>
              </div>

              {/* 2ª tentativa */}
              <div className="bg-white border border-l-4 border-l-[#F59E0B] border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <span className="inline-block bg-[#FFFBEB] text-[#92400E] px-3 py-1 rounded-full text-xs font-medium mb-2">2ª tentativa</span>
                <p className="text-xs text-[#64748B] italic mb-3">Enviar após <strong>3 dias</strong> sem resposta</p>
                <Textarea value={message2} readOnly className="w-full h-24 text-sm border-[#E2E8F0] bg-[#F8FAFC] resize-none mb-2 cursor-default" />
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">{message2.length}/500</span>
                </div>
              </div>

              {/* 3ª tentativa */}
              <div className="bg-white border border-l-4 border-l-[#EF4444] border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <span className="inline-block bg-[#FEF2F2] text-[#DC2626] px-3 py-1 rounded-full text-xs font-medium mb-2">3ª tentativa</span>
                <p className="text-xs text-[#64748B] italic mb-3">Enviar após <strong>5 dias</strong> sem resposta</p>
                <Textarea value={message3} readOnly className="w-full h-24 text-sm border-[#E2E8F0] bg-[#F8FAFC] resize-none mb-2 cursor-default" />
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">{message3.length}/500</span>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Overlay do painel */}
      {showFilterPanel && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setShowFilterPanel(false)}
        />
      )}

      {/* Painel lateral de filtros */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${showFilterPanel ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Filtros avançados</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Refine a lista de pacientes</p>
          </div>
          <button
            onClick={() => setShowFilterPanel(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F8FAFC] text-[#64748B] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Tentativa */}
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Tentativa de contato</p>
            <div className="space-y-2">
              {[
                { id: "all", label: "Todas as tentativas" },
                { id: "1", label: "1ª tentativa — primeiro contato" },
                { id: "2", label: "2ª tentativa — sem resposta" },
                { id: "3", label: "3ª tentativa ⚠️ — última chance" },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setFilterAttempt(opt.id as any)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      filterAttempt === opt.id ? "border-[#0F3460] bg-[#0F3460]" : "border-[#CBD5E1] group-hover:border-[#0F3460]"
                    }`}
                  >
                    {filterAttempt === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm ${filterAttempt === opt.id ? "text-[#0F3460] font-medium" : "text-[#1E293B]"}`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E2E8F0]" />

          {/* Procedimento */}
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Procedimento</p>
            <div className="space-y-2">
              {allProcedures.map((proc) => (
                <label key={proc} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleProcedure(proc)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      filterProcedures.includes(proc) ? "border-[#0F3460] bg-[#0F3460]" : "border-[#CBD5E1] group-hover:border-[#0F3460]"
                    }`}
                  >
                    {filterProcedures.includes(proc) && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${filterProcedures.includes(proc) ? "text-[#0F3460] font-medium" : "text-[#1E293B]"}`}>
                    {proc}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {fila.filter(p => p.procedure === proc).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E2E8F0]" />

          {/* Valor estimado */}
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Valor estimado da consulta</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-[#64748B] mb-1 block">De</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">R$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={filterMinValue}
                    onChange={(e) => setFilterMinValue(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  />
                </div>
              </div>
              <span className="text-[#94A3B8] mb-2">—</span>
              <div className="flex-1">
                <label className="text-xs text-[#64748B] mb-1 block">Até</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">R$</span>
                  <input
                    type="number"
                    placeholder="9999"
                    value={filterMaxValue}
                    onChange={(e) => setFilterMaxValue(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  />
                </div>
              </div>
            </div>
            {/* Atalhos rápidos */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { label: "Até R$ 500", min: "", max: "500" },
                { label: "R$ 500–2000", min: "500", max: "2000" },
                { label: "Acima R$ 2000", min: "2000", max: "" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setFilterMinValue(preset.min); setFilterMaxValue(preset.max) }}
                  className="text-xs px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E2E8F0]" />

          {/* Dias sem consulta */}
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Dias sem consulta</p>
            <div>
              <label className="text-xs text-[#64748B] mb-1 block">Mínimo de dias</label>
              <input
                type="number"
                placeholder="Ex: 180"
                value={filterMinDays}
                onChange={(e) => setFilterMinDays(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
              />
            </div>
            {/* Atalhos rápidos */}
            <div className="flex gap-2 mt-2">
              {[
                { label: "+120 dias", value: "120" },
                { label: "+180 dias", value: "180" },
                { label: "+365 dias", value: "365" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setFilterMinDays(preset.value)}
                  className="text-xs px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer do painel */}
        <div className="p-5 border-t border-[#E2E8F0] flex gap-3">
          <button
            onClick={() => {
              setFilterAttempt("all")
              setFilterProcedures([])
              setFilterMinValue("")
              setFilterMaxValue("")
              setFilterMinDays("")
            }}
            className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 h-10 rounded-lg bg-[#0F3460] text-white text-sm font-medium hover:bg-[#0A2540] transition-colors"
          >
            Aplicar filtros
          </button>
        </div>

      </div>

    </div>
  )
}