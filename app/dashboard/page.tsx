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
  Search, 
  Bell,
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
  LogOut
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
    action: "lembrete"
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
    action: "agendamento"
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
    action: "direto"
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
    action: "agendamento"
  }
]

const chartData = [
  { month: "Nov", emRisco: 8, recuperados: 2 },
  { month: "Dez", emRisco: 12, recuperados: 4 },
  { month: "Jan", emRisco: 15, recuperados: 5 },
  { month: "Fev", emRisco: 18, recuperados: 7 },
  { month: "Mar", emRisco: 22, recuperados: 9 },
  { month: "Abr", emRisco: 24, recuperados: 11 }
]

const notifications = [
  {
    id: 1,
    type: "alert",
    text: "5 novos pacientes em risco hoje",
    time: "Há 2 horas"
  },
  {
    id: 2,
    type: "whatsapp",
    text: "Maria Silva respondeu sua mensagem",
    time: "Há 3 horas"
  },
  {
    id: 3,
    type: "calendar",
    text: "João Santos confirmou consulta",
    time: "Há 5 horas"
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeNav, setActiveNav] = useState("dashboard")
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  const userName = session?.user?.name || "Usuário"
  const userEmail = session?.user?.email || ""
  const [clinicName, setClinicName] = useState("Carregando...")
  const [clinicCity, setClinicCity] = useState("")
  const userRole = "Administrador"
  const userInitial = userName[0]?.toUpperCase() || "U"

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("onboarding_done") !== "true") {
        router.push("/onboarding")
        return
      }
      
      setActiveNav("dashboard")
    }
  }, [router])

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setDados(data)
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [])

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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const handleLogout = () => {
    router.push("/")
  }

  const searchResults = searchQuery.trim() === "" 
    ? []
    : samplePatients.filter(patient => 
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone.includes(searchQuery)
      )

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "")
    const message = encodeURIComponent(`Olá ${name}! Estamos entrando em contato para agendar sua consulta.`)
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank")
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
      <div className="flex-1 flex flex-col overflow-hidden">
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
                      {searchResults.map((patient) => {
                        const config = statusConfig[patient.status]
                        return (
                          <button
                            key={patient.id}
                            onClick={() => {
                              setSearchQuery("")
                              setShowSearchDropdown(false)
                              router.push(`/dashboard/pacientes?patient=${patient.id}`)
                            }}
                            className="w-full p-3 hover:bg-[#F8FAFC] transition-colors text-left flex items-center gap-3"
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold flex-shrink-0 ${patient.avatarColor}`}>
                              {patient.name.split(" ").map(n => n[0]).join("").substring(0, 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[#1E293B]">{patient.name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} font-medium`}>
                                  {config.label}
                                </span>
                              </div>
                              <p className="text-xs text-[#64748B] mt-0.5">{patient.daysSinceVisit} dias</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[#64748B] hover:text-[#1E293B] transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-medium text-white">
                  3
                </span>
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-lg z-50">
                  <div className="p-4 border-b border-[#E2E8F0]">
                    <h4 className="text-sm font-semibold text-[#1E293B]">Notificações</h4>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                            notification.type === "alert" ? "bg-[#FEE2E2]" :
                            notification.type === "whatsapp" ? "bg-[#D1FAE5]" : "bg-[#DBEAFE]"
                          }`}>
                            {notification.type === "alert" ? (
                              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                            ) : notification.type === "whatsapp" ? (
                              <MessageCircle className="h-4 w-4 text-[#10B981]" />
                            ) : (
                              <Calendar className="h-4 w-4 text-[#3B82F6]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-[#1E293B]">{notification.text}</p>
                            <p className="text-xs text-[#94A3B8] mt-0.5">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-[#E2E8F0]">
                    <button className="w-full text-center text-sm text-[#1E3A5F] font-medium hover:underline">
                      Ver todas as notificações
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <AlertaConfiguracao />
          
          {/* Alert Banner */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]/10">
              <TrendingUp className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <p className="text-sm text-[#3B82F6]">
              <span className="font-semibold text-[#1E40AF]">{carregando ? "..." : `Você tem ${dados?.cards?.emRisco ?? 0} pacientes em risco`}</span> com potencial de <span className="font-semibold text-[#1E40AF]">{carregando ? "..." : `R$ ${dados?.cards?.receitaEmRisco?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "0,00"}`}</span> recuperável. Comece pelos mais urgentes.
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-4 gap-4 mb-7">
            {/* Card 1 - Pacientes em risco */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Pacientes em risco</p>
                  <p className="text-3xl font-semibold text-[#1E293B] mt-2">{carregando ? "..." : dados?.cards?.emRisco ?? 0}</p>
                  <div className="mt-2">
                    <p className="text-sm text-[#EF4444] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      +5 novos hoje
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">desde ontem</p>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF2F2]">
                  <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                </div>
              </div>
            </div>

            {/* Card 2 - Aguardando resposta */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Aguardando resposta</p>
                  <p className="text-3xl font-semibold text-[#1E293B] mt-2">{carregando ? "..." : dados?.cards?.totalPacientes ?? 0}</p>
                  <div className="mt-2">
                    <p className="text-sm text-[#F59E0B]">oportunidades abertas</p>
                    <p className="text-xs text-[#64748B] mt-0.5">podem esfriar em breve</p>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF7ED]">
                  <Clock className="h-5 w-5 text-[#F59E0B]" />
                </div>
              </div>
            </div>

            {/* Card 3 - Contatados este mês */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Contatados este mês</p>
                  <p className="text-3xl font-semibold text-[#1E293B] mt-2">{carregando ? "..." : dados?.cards?.recuperados ?? 0}</p>
                  <div className="mt-2">
                    <p className="text-sm text-[#10B981] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      14 responderam
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">taxa de resposta 45%</p>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF]">
                  <Send className="h-5 w-5 text-[#3B82F6]" />
                </div>
              </div>
            </div>

            {/* Card 4 - Receita recuperada */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Receita recuperada</p>
                  <p className="text-3xl font-semibold text-[#1E293B] mt-2">{carregando ? "..." : `R$ ${dados?.cards?.receitaEmRisco?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "0,00"}`}</p>
                  <div className="mt-2">
                    <p className="text-sm text-[#10B981]">este mês</p>
                    <p className="text-xs text-[#64748B] mt-0.5">11 pacientes voltaram</p>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0FDF4]">
                  <DollarSign className="h-5 w-5 text-[#10B981]" />
                </div>
              </div>
            </div>
          </div>

          {/* Chart - Full Width */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-7 mb-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-medium text-[#1E293B]">Pacientes em risco ao longo do tempo</h3>
                <HelpCircle className="h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
              <Select defaultValue="6months">
                <SelectTrigger className="w-40 h-9 text-sm border-[#E2E8F0]">
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="3months">Últimos 3 meses</SelectItem>
                  <SelectItem value="1year">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={carregando ? chartData : (dados?.grafico || chartData)}>
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
                    domain={[0, 30]}
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
      
      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
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
