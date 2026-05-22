"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Building2,
  MapPin,
  Phone,
  Info,
  Lock,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Check,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { useSession } from "next-auth/react"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Pacientes", icon: Users },
  { id: "automation", label: "Central de Envios", icon: Zap },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "settings", label: "Configurações", icon: Settings },
]


export default function ConfiguracoesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [clinicName, setClinicName] = useState("")
  const [clinicCity, setClinicCity] = useState("")
  const [userName, setUserName] = useState("")
  const [activeNav, setActiveNav] = useState("settings")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<"clinica" | "mensagens">("clinica")

  // Clínica fields
  const [fieldClinicName, setFieldClinicName] = useState("")
  const [fieldCity, setFieldCity] = useState("")
  const [fieldPhone, setFieldPhone] = useState("")
  const [fieldTicketMedio, setFieldTicketMedio] = useState("")

  // WhatsApp fields
  const [fieldWhatsappNumber, setFieldWhatsappNumber] = useState("")

  // Mensagens fields
  const [message1, setMessage1] = useState("")
  const [message2, setMessage2] = useState("")
  const [message3, setMessage3] = useState("")

  const textarea1Ref = useRef<HTMLTextAreaElement>(null)
  const textarea2Ref = useRef<HTMLTextAreaElement>(null)
  const textarea3Ref = useRef<HTMLTextAreaElement>(null)

  // Save states
  const [savingClinica, setSavingClinica] = useState(false)
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)
  const [savingMensagens, setSavingMensagens] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("onboarding_done") !== "true") {
        router.push("/onboarding")
        return
      }
      setActiveNav("settings")

      // Carregar dados da clínica
      fetch("/api/clinica")
      .then((res) => res.json())
      .then((data) => {
        setClinicName(data.nome ?? "")
        setClinicCity(data.cidade ?? "")
        setFieldClinicName(data.nome ?? "")
        setFieldPhone(data.telefone ?? "")
        setFieldCity(data.cidade ?? "")
        setFieldTicketMedio(data.ticketMedio?.toString() ?? "")
      })
      .catch((error) => console.error("Erro ao carregar clínica:", error))

      
      if (session?.user?.name) setUserName(session.user.name.split(" ")[0])

      // Carregar mensagens
      fetch("/api/mensagens")
        .then((res) => res.json())
        .then((data) => {
          setMessage1(data.mensagem1 ?? "")
          setMessage2(data.mensagem2 ?? "")
          setMessage3(data.mensagem3 ?? "")
        })
        .catch((error) => console.error("Erro ao carregar mensagens:", error))
    }
  }, [router])

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

  const handleNavigation = (navId: string) => {
    setActiveNav(navId)
    if (navId === "dashboard") router.push("/dashboard")
    else if (navId === "patients") router.push("/dashboard/pacientes")
    else if (navId === "automation") router.push("/dashboard/automacao")
    else if (navId === "reports") router.push("/dashboard/relatorios")
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSaveClinica = async () => {
    setSavingClinica(true)
    try {
      const res = await fetch("/api/clinica", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: fieldClinicName,
          telefone: fieldPhone,
          cidade: fieldCity,
          ticketMedio: fieldTicketMedio,
        }),
      })

      if (res.ok) {
        setToastMessage("Dados salvos com sucesso!")
        setTimeout(() => setToastMessage(null), 3000)
      }
    } catch (error) {
      console.error("Erro ao salvar clínica:", error)
    } finally {
      setSavingClinica(false)
    }
  }

  const handleSaveMensagens = async () => {
    setSavingMensagens(true)
    try {
      const res = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem1: message1,
          mensagem2: message2,
          mensagem3: message3,
        }),
      })

      if (res.ok) {
        setToastMessage("Mensagens salvas com sucesso!")
        setTimeout(() => setToastMessage(null), 3000)
      }
    } catch (error) {
      console.error("Erro ao salvar mensagens:", error)
    } finally {
      setSavingMensagens(false)
    }
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const insertVariable = (variable: string, msgNum: 1 | 2 | 3) => {
    const ref = msgNum === 1 ? textarea1Ref : msgNum === 2 ? textarea2Ref : textarea3Ref
    const setter = msgNum === 1 ? setMessage1 : msgNum === 2 ? setMessage2 : setMessage3
    const current = msgNum === 1 ? message1 : msgNum === 2 ? message2 : message3
    const el = ref.current
    if (el) {
      const start = el.selectionStart ?? current.length
      const end = el.selectionEnd ?? current.length
      const newVal = current.slice(0, start) + variable + current.slice(end)
      setter(newVal)
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    } else {
      setter(current + variable)
    }
  }

  const inputStyle = "h-11 border-[#E2E8F0] bg-white text-[#1E293B] text-sm placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[rgba(15,52,96,0.12)] focus-visible:border-[#0F3460]"

  const tabs = [
    { id: "clinica", label: "Clínica" },
    { id: "mensagens", label: "Mensagens" },
  ] as const

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#10B981] text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          <CheckCircle className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

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
                {userName?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
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
                  <p className="text-xs font-semibold text-[#1E293B] truncate">{userName}</p>
                  <p className="text-xs text-[#64748B] truncate">{clinicName}</p>
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
                {userName[0].toUpperCase()}
              </div>
              <p className="text-base font-semibold text-[#1E293B]">{userName}</p>
              <p className="text-sm text-[#64748B]">Administrador</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={userName}
                  readOnly
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] bg-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Clínica
                </label>
                <input
                  type="text"
                  value={clinicName}
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
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-[#1E293B]">Configurações</h1>
            <p className="text-xs text-[#64748B]">Gerencie os dados da sua clínica e as preferências do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                placeholder="Buscar..."
                className="h-9 w-52 pl-9 pr-3 rounded-lg border border-[#E2E8F0] text-sm bg-[#F8FAFC] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[rgba(15,52,96,0.12)] focus:border-[#0F3460]"
              />
            </div>
           
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-[#E2E8F0] px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? "border-[#0F3460] text-[#0F3460]"
                      : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* TAB 1 — Clínica */}
              {activeTab === "clinica" && (
                <div className="max-w-2xl">
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
                <h2 className="text-base font-bold text-[#1E293B] mb-1">Dados da clínica</h2>
                <p className="text-sm text-[#64748B] mb-6">Essas informações aparecem nas mensagens enviadas aos pacientes.</p>

                <div className="space-y-4">
                  {/* Nome da clínica */}
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Nome da clínica</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <Input
                        className={`pl-9 ${inputStyle}`}
                        placeholder="Nome da sua clínica"
                        value={fieldClinicName}
                        onChange={(e) => setFieldClinicName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cidade */}
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Cidade</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <Input
                        className={`pl-9 ${inputStyle}`}
                        placeholder="Cidade da clínica"
                        value={fieldCity}
                        onChange={(e) => setFieldCity(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Telefone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <Input
                        className={`pl-9 ${inputStyle}`}
                        placeholder="(XX) XXXXX-XXXX"
                        type="tel"
                        value={fieldPhone}
                        onChange={(e) => setFieldPhone(formatPhone(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Ticket médio */}
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Ticket médio (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">R$</span>
                      <Input
                        className={`pl-10 ${inputStyle}`}
                        placeholder="300"
                        type="number"
                        value={fieldTicketMedio}
                        onChange={(e) => setFieldTicketMedio(e.target.value)}
                      />
                    </div>
                  </div>

                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleSaveClinica}
                    disabled={savingClinica}
                    className="bg-[#0F3460] hover:bg-[#0d2d54] text-white h-10 px-5"
                  >
                    {savingClinica ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar alterações"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 — Mensagens */}
          {activeTab === "mensagens" && (
            <div>
              <div className="mb-5">
                <h2 className="text-base font-bold text-[#1E293B]">Modelos de mensagem</h2>
                <p className="text-sm text-[#64748B]">Edite os textos usados em cada tentativa de contato. As mesmas mensagens da tela de Central de Envios.</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                {/* Mensagem 1 */}
                <MessageCard
                  borderColor="border-l-[#3B82F6]"
                  badgeStyle="bg-[#EFF6FF] text-[#1D4ED8]"
                  badge="1ª tentativa"
                  label="Enviar assim que entrar na fila"
                  value={message1}
                  onChange={setMessage1}
                  textareaRef={textarea1Ref}
                  onInsert={(v) => insertVariable(v, 1)}
                />
                {/* Mensagem 2 */}
                <MessageCard
                  borderColor="border-l-[#F59E0B]"
                  badgeStyle="bg-[#FFFBEB] text-[#92400E]"
                  badge="2ª tentativa"
                  label="Enviar após 3 dias sem resposta"
                  value={message2}
                  onChange={setMessage2}
                  textareaRef={textarea2Ref}
                  onInsert={(v) => insertVariable(v, 2)}
                />
                {/* Mensagem 3 */}
                <MessageCard
                  borderColor="border-l-[#EF4444]"
                  badgeStyle="bg-[#FEF2F2] text-[#DC2626]"
                  badge="3ª tentativa"
                  label="Enviar após 5 dias sem resposta"
                  value={message3}
                  onChange={setMessage3}
                  textareaRef={textarea3Ref}
                  onInsert={(v) => insertVariable(v, 3)}
                />
              </div>

              <div className="flex items-center justify-end gap-4">
                <p className="text-xs text-[#94A3B8] italic">
                  Alterações aqui também atualizam as mensagens na tela de Central de Envios.
                </p>
                <Button
                  onClick={handleSaveMensagens}
                  disabled={savingMensagens}
                  className="bg-[#0F3460] hover:bg-[#0d2d54] text-white h-10 px-5 shrink-0"
                >
                  {savingMensagens ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar mensagens"
                  )}
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function MessageCard({
  borderColor,
  badgeStyle,
  badge,
  label,
  value,
  onChange,
  textareaRef,
  onInsert,
}: {
  borderColor: string
  badgeStyle: string
  badge: string
  label: string
  value: string
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onInsert: (v: string) => void
}) {
  const MAX = 500
  return (
    <div className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${borderColor} p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>{badge}</span>
      </div>
      <p className="text-xs text-[#64748B] mb-3">{label}</p>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX))}
        rows={5}
        className="text-sm border-[#E2E8F0] resize-none focus-visible:ring-2 focus-visible:ring-[rgba(15,52,96,0.12)] focus-visible:border-[#0F3460]"
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1.5">
          {["[nome]", "[clinica]"].map((v) => (
            <button
              key={v}
              onClick={() => onInsert(v)}
              className="text-xs bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 rounded font-mono hover:bg-[#DBEAFE] transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#94A3B8]">{value.length}/{MAX}</span>
      </div>
    </div>
  )
}
