"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Zap,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  AlertTriangle,
  Calendar,
  Upload,
  Download,
  Pencil,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { parsearArquivoPacientes } from "@/lib/parsearArquivoPacientes"
import { aplicarRisco } from "@/lib/calcularRisco"
import { normalizarParaWhatsApp, validarTelefone, gerarLinkWhatsApp } from "@/lib/formatarTelefone"

type PatientStatus = "em_risco" | "ativo" | "em_contato" | "contatado" | "recuperado" | "sem_resposta" | "nao_contatar"

type Patient = {
  id: number
  name: string
  phone: string
  lastVisit: string
  daysSinceVisit: number
  avgTicket: number
  status: PatientStatus
  avatarColor: string
  dadosIncompletos?: boolean
  procedimento?: string
  rawUltimaConsulta?: string
  vaiMarcar?: boolean
}

const samplePatients: Patient[] = [
  { id: 1, name: "Ana Costa", phone: "(11) 98765-4321", lastVisit: "12 jan 2024", daysSinceVisit: 210, avgTicket: 450, status: "em_risco", avatarColor: "bg-[#3B82F6]" },
  { id: 2, name: "João Lima", phone: "(11) 91234-5678", lastVisit: "05 fev 2024", daysSinceVisit: 180, avgTicket: 300, status: "em_contato", avatarColor: "bg-[#10B981]" },
  { id: 3, name: "Carla Souza", phone: "(11) 99876-5432", lastVisit: "20 fev 2024", daysSinceVisit: 165, avgTicket: 520, status: "sem_resposta", avatarColor: "bg-[#8B5CF6]" },
  { id: 4, name: "Marcos Reis", phone: "(11) 92345-6789", lastVisit: "01 mar 2024", daysSinceVisit: 140, avgTicket: 280, status: "em_contato", avatarColor: "bg-[#F59E0B]" },
  { id: 5, name: "Paula Nunes", phone: "(11) 93456-7890", lastVisit: "15 mar 2024", daysSinceVisit: 120, avgTicket: 390, status: "recuperado", avatarColor: "bg-[#EF4444]" },
  { id: 6, name: "Roberto Silva", phone: "(11) 94567-8901", lastVisit: "28 mar 2024", daysSinceVisit: 95, avgTicket: 600, status: "nao_contatar", avatarColor: "bg-[#1E3A5F]" },
  { id: 7, name: "Fernanda Lima", phone: "(11) 95678-9012", lastVisit: "10 abr 2024", daysSinceVisit: 85, avgTicket: 350, status: "em_risco", avatarColor: "bg-[#059669]" },
  { id: 8, name: "Carlos Mendes", phone: "(11) 96789-0123", lastVisit: "22 abr 2024", daysSinceVisit: 73, avgTicket: 420, status: "em_contato", avatarColor: "bg-[#DC2626]" },
  { id: 9, name: "Juliana Santos", phone: "(11) 97890-1234", lastVisit: "05 mai 2024", daysSinceVisit: 60, avgTicket: 380, status: "recuperado", avatarColor: "bg-[#7C3AED]" },
  { id: 10, name: "Pedro Oliveira", phone: "(11) 98901-2345", lastVisit: "15 mai 2024", daysSinceVisit: 50, avgTicket: 550, status: "em_risco", avatarColor: "bg-[#0891B2]" },
]

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  ativo: { label: "Ativo", bgColor: "bg-transparent", textColor: "text-[#94A3B8]" },
  contatado: { label: "Aguardando resposta", bgColor: "bg-transparent", textColor: "text-[#3B82F6]" },
  em_contato: { label: "Aguardando resposta", bgColor: "bg-transparent", textColor: "text-[#3B82F6]" },
  aguardando_resposta: { label: "Sem retorno", bgColor: "bg-transparent", textColor: "text-[#F59E0B]" },
  recuperado: { label: "Recuperado", bgColor: "bg-transparent", textColor: "text-[#10B981]" },
  nao_contatar: { label: "Não contatar", bgColor: "bg-transparent", textColor: "text-[#94A3B8] line-through" },
  em_risco: { label: "Em risco", bgColor: "bg-transparent", textColor: "text-[#EF4444]" },
}

const tabFilters: { key: PatientStatus | "all" | "incompletos"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "incompletos", label: "Dados incompletos" },
  { key: "em_risco", label: "Em risco" },
  { key: "contatado", label: "Em contato" },
  { key: "recuperado", label: "Recuperados" },
]

const notifications = [
  { id: 1, type: "alert", text: "5 novos pacientes em risco hoje", time: "Há 2 horas" },
  { id: 2, type: "whatsapp", text: "Maria Silva respondeu sua mensagem", time: "Há 3 horas" },
  { id: 3, type: "calendar", text: "João Santos confirmou consulta", time: "Há 5 horas" }
]

export default function PatientsPage() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState("Clínica Sorriso")
  const [clinicCity, setClinicCity] = useState("São Paulo - SP")
  const [userName, setUserName] = useState("Kayky")
  const [activeNav, setActiveNav] = useState("patients")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // Table state
  const [patients, setPatients] = useState<Patient[]>(samplePatients)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<PatientStatus | "all" | "incompletos">("all")
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "ate6m" | "6a12m" | "mais1a">("todos")
  const [selectedPatients, setSelectedPatients] = useState<number[]>([])
  const [sortField, setSortField] = useState<"daysSinceVisit" | "avgTicket" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [isLoading, setIsLoading] = useState(false)
  const [rawPatients, setRawPatients] = useState<any[]>([])

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    lastVisit: "",
    procedure: "",
    value: ""
  })

  // Form state
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    lastVisit: "",
    procedure: "",
    value: ""
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<{ importados: number; duplicados: number; incompletos: number } | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" })
  const [menuAcaoPaciente, setMenuAcaoPaciente] = useState<Record<number, boolean>>({})
  const [mensagemDireta, setMensagemDireta] = useState("")
const [mensagem1, setMensagem1] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveNav("patients")
      
      const savedSignupData = localStorage.getItem("signup_data")
      if (savedSignupData) {
        try {
          const parsed = JSON.parse(savedSignupData)
          if (parsed.fullName) setUserName(parsed.fullName.split(" ")[0])
          if (parsed.clinicName) {
            setClinicName(parsed.clinicName)
          }
          if (parsed.city) setClinicCity(parsed.city)
        } catch {
          // usar defaults
        }
      }

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

      // Fetch patients from API
      fetchPatients()

      fetch("/api/mensagens")
        .then((res) => res.json())
        .then((data) => {
          if (data.mensagemDireta) setMensagemDireta(data.mensagemDireta)
        })
        .catch(() => {})

      // Buscar mensagem1 das configurações
      fetch("/api/mensagens")
        .then((res) => res.json())
        .then((data) => {
          if (data.mensagem1) setMensagem1(data.mensagem1)
        })
        .catch(() => {})
    }
  }, [])

  const montarMensagem = (template: string, nome: string) => {
    return template
      .replace(/\[nome\]/g, nome)
      .replace(/\[clinica\]/g, clinicName)
  }

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/pacientes')
      if (response.ok) {
        const data = await response.json()
        // Map database fields to UI fields
        const mappedPatients = data.map((p: any) => {
          const ultimaConsulta = p.ultimaConsulta ? new Date(p.ultimaConsulta) : null
          const daysSinceVisit = ultimaConsulta 
            ? Math.floor((Date.now() - ultimaConsulta.getTime()) / (1000 * 60 * 60 * 24))
            : 0
          const getAvatarColor = (nome: string) => {
            const colors = [
              "bg-[#3B82F6]",
              "bg-[#10B981]",
              "bg-[#F59E0B]",
              "bg-[#EF4444]",
              "bg-[#0891B2]",
              "bg-[#8B5CF6]",
              "bg-[#EC4899]",
              "bg-[#F97316]",
            ]
            const hash = (nome ?? "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
            return colors[hash % colors.length]
          }

          return {
            id: p.id,
            name: p.nome,
            phone: p.telefone,
            lastVisit: ultimaConsulta ? ultimaConsulta.toLocaleDateString('pt-BR') : '',
            rawUltimaConsulta: p.ultimaConsulta ? new Date(p.ultimaConsulta).toISOString().split('T')[0] : '',
            daysSinceVisit,
            avgTicket: p.valorUltimaConsulta || 0,
            status: p.status || 'ativo',
            avatarColor: getAvatarColor(p.nome),
            dadosIncompletos: p.dadosIncompletos || false,
            procedimento: p.procedimento || '',
            vaiMarcar: p.vaiMarcar || false
          }
        })
        setPatients(mappedPatients)
        setRawPatients(data)
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".export-menu")) {
        setShowExportDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
    if (navId === "dashboard") {
      router.push("/dashboard")
    } else if (navId === "patients") {
      // Already on patients page
    } else if (navId === "automation") {
      router.push("/dashboard/automacao")
    } else if (navId === "reports") {
      router.push("/dashboard/relatorios")
    } else if (navId === "settings") {
      router.push("/dashboard/configuracoes")
    }
  }

  const getDaysColor = (days: number) => {
    if (days >= 180) return "text-[#EF4444] font-semibold"
    if (days >= 120) return "text-[#F59E0B] font-semibold"
    return "text-[#64748B]"
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Pacientes", icon: Users },
    { id: "automation", label: "Central de Envios", icon: Zap },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
    { id: "settings", label: "Configurações", icon: Settings }
  ]

  const handleExportCSV = () => {
    const headers = ["Nome", "Telefone", "Última consulta", "Dias sem retorno", "Ticket médio", "Status"]
    const csvContent = [
      headers.join(","),
      ...patients.map(p => `"${p.name}","${p.phone}","${p.lastVisit}","${p.daysSinceVisit}","${p.avgTicket}","${(statusConfig[p.status as PatientStatus] ?? { label: "Desconhecido" }).label}"`)
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "pacientes.csv"
    link.click()
    setShowExportDropdown(false)
    showToast("Arquivo gerado!")
  }

  const handleExportExcel = () => {
    const headers = ["Nome", "Telefone", "Última consulta", "Dias sem retorno", "Ticket médio", "Status"]
    const csvContent = [
      headers.join(","),
      ...patients.map(p => `"${p.name}","${p.phone}","${p.lastVisit}","${p.daysSinceVisit}","${p.avgTicket}","${(statusConfig[p.status as PatientStatus] ?? { label: "Desconhecido" }).label}"`)
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "pacientes.csv"
    link.click()
    setShowExportDropdown(false)
    showToast("Arquivo gerado!")
  }

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let result = [...patients]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.phone.includes(query)
      )
    }

    // Filtro de período
    if (filtroPeriodo === "ate6m") {
      result = result.filter(p => p.daysSinceVisit <= 180)
    } else if (filtroPeriodo === "6a12m") {
      result = result.filter(p => p.daysSinceVisit > 180 && p.daysSinceVisit <= 365)
    } else if (filtroPeriodo === "mais1a") {
      result = result.filter(p => p.daysSinceVisit > 365)
    }

    // Tab filter
    if (activeTab === "incompletos") {
      result = result.filter(p => p.dadosIncompletos === true || (p.dadosIncompletos as any) === "true")
    } else if (activeTab === "em_risco") {
      // Usar a mesma lógica de cálculo de risco que o dashboard
      const pacientesComRisco = aplicarRisco(rawPatients)
      const idsEmRisco = new Set(pacientesComRisco.filter(p => p.nivelRisco !== "ok").map(p => String(p.id)))
      result = result.filter(p => idsEmRisco.has(String(p.id)))
    } else if (activeTab !== "all") {
      result = result.filter(p => p.status === activeTab)
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      })
    }
    
    return result
  }, [patients, searchQuery, activeTab, sortField, sortDirection, filtroPeriodo])

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage)
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: patients.length }
    tabFilters.forEach(tab => {
      if (tab.key !== "all") {
        if (tab.key === "incompletos") {
          counts[tab.key] = patients.filter(p => p.dadosIncompletos === true || (p.dadosIncompletos as any) === "true").length
        } else if (tab.key === "em_risco") {
          const pacientesComRisco = aplicarRisco(rawPatients)
          counts[tab.key] = pacientesComRisco.filter(p => p.nivelRisco !== "ok").length
        } else {
          counts[tab.key] = patients.filter(p => p.status === tab.key).length
        }
      }
    })
    return counts
  }, [patients])

  const handleSort = (field: "daysSinceVisit" | "avgTicket") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPatients(paginatedPatients.map(p => p.id))
    } else {
      setSelectedPatients([])
    }
  }

  const handleSelectPatient = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, id])
    } else {
      setSelectedPatients(prev => prev.filter(pId => pId !== id))
    }
  }

  const showToast = (message: string) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: "" }), 3000)
  }

  const handleAcaoPaciente = async (pacienteId: number, acao: string) => {
    setMenuAcaoPaciente((prev) => ({ ...prev, [pacienteId]: false }))
    try {
      if (acao === "recuperado") {
        const valorStr = window.prompt("Qual o valor da consulta? (deixe em branco para usar o valor registrado)")
        if (valorStr === null) return
        const valor = valorStr.trim() === "" ? 0 : parseFloat(valorStr.replace(",", "."))
        await fetch("/api/envios/recuperado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pacienteId, acao: "recuperado", valorRecuperado: valor }),
        })
        showToast("Paciente marcado como recuperado!")
      } else {
        await fetch("/api/envios/recuperado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pacienteId, acao }),
        })
        if (acao === "vai_marcar") showToast("Anotado! Paciente ficará em espera por 7 dias.")
        if (acao === "nao_contatar") showToast("Paciente marcado como não contatar.")
        if (acao === "numero_errado") showToast("Paciente movido para dados incompletos.")
      }
      await fetchPatients()
    } catch (error) {
      console.error(error)
      showToast("Erro ao processar ação")
    }
  }
  const handleMarkAsContacted = async (patientId: number) => {
    try {
      const response = await fetch(`/api/pacientes/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'em_contato' })
      })
      if (response.ok) {
        setPatients(prev => prev.map(p =>
          p.id === patientId ? { ...p, status: "em_contato" as PatientStatus } : p
        ))
        showToast("Paciente marcado como contatado!")
      } else {
        showToast("Erro ao atualizar status")
      }
    } catch (error) {
      console.error('Erro ao marcar como contatado:', error)
      showToast("Erro ao atualizar status")
    }
  }

  const handleBulkMarkAsContacted = async () => {
    try {
      await Promise.all(
        selectedPatients.map(id =>
          fetch(`/api/pacientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'em_contato' })
          })
        )
      )
      setPatients(prev => prev.map(p =>
        selectedPatients.includes(p.id) ? { ...p, status: "em_contato" as PatientStatus } : p
      ))
      setSelectedPatients([])
      showToast(`${selectedPatients.length} pacientes marcados como contatados!`)
    } catch (error) {
      console.error('Erro ao marcar em massa:', error)
      showToast("Erro ao atualizar status")
    }
  }

  const handleBulkPacienteVoltou = async () => {
  if (selectedPatients.length > 1) {
    showToast("Para registrar o retorno, selecione um paciente por vez.")
    return
  }
  const valorStr = window.prompt("Qual o valor da consulta? (deixe em branco para usar o valor registrado)")
  if (valorStr === null) return
  const valor = valorStr.trim() === "" ? 0 : parseFloat(valorStr.replace(",", "."))
  try {
    await Promise.all(
      selectedPatients.map(id =>
        fetch("/api/envios/recuperado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pacienteId: id, acao: "recuperado", valorRecuperado: valor }),
        })
      )
    )
    setSelectedPatients([])
    await fetchPatients()
    showToast(`${selectedPatients.length} pacientes marcados como recuperados!`)
  } catch {
    showToast("Erro ao atualizar pacientes")
  }
}

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setEditForm({
      name: patient.name,
      phone: patient.phone,
      lastVisit: patient.rawUltimaConsulta || '',
      procedure: patient.procedimento || '',
      value: patient.avgTicket ? String(patient.avgTicket) : ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingPatient) return

    if (editForm.phone && !validarTelefone(editForm.phone)) {
      showToast("Telefone inválido. Digite DDD + número. Ex: (47) 99999-0000")
      return
    }

    const telefoneNormalizado = editForm.phone ? normalizarParaWhatsApp(editForm.phone) : undefined

    try {
      const response = await fetch(`/api/pacientes/${editingPatient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editForm.name,
          telefone: telefoneNormalizado,
          telefoneBruto: editForm.phone,
          ultimaConsulta: editForm.lastVisit || undefined,
          procedimento: editForm.procedure || undefined,
          valorUltimaConsulta: editForm.value ? parseFloat(editForm.value) : undefined,
        })
      })
      if (response.ok) {
        await fetchPatients()
        setShowEditModal(false)
        setEditingPatient(null)
        showToast("Paciente atualizado com sucesso!")
      } else {
        showToast("Erro ao atualizar paciente")
      }
    } catch {
      showToast("Erro ao atualizar paciente")
    }
  }

  const handleDeletePatient = async () => {
  if (!deletingPatient) return
  try {
    const response = await fetch(`/api/pacientes/${deletingPatient.id}`, {
      method: 'DELETE'
    })
    if (response.ok) {
      await fetchPatients()
      setShowDeleteConfirm(false)
      setDeletingPatient(null)
      showToast("Paciente removido com sucesso!")
    } else {
      showToast("Erro ao remover paciente")
    }
  } catch {
    showToast("Erro ao remover paciente")
  }
}

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }

  const handleAddPatient = async () => {
    if (!newPatient.name || !newPatient.phone || !newPatient.lastVisit) return

    if (!validarTelefone(newPatient.phone)) {
      showToast("Telefone inválido. Digite DDD + número. Ex: (47) 99999-0000")
      return
    }

    const telefoneNormalizado = normalizarParaWhatsApp(newPatient.phone)
    
    try {
      const response = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newPatient.name,
          telefone: telefoneNormalizado,
          telefoneBruto: newPatient.phone,
          ultimaConsulta: newPatient.lastVisit,
          procedimento: newPatient.procedure || undefined,
          valor_ticket: newPatient.value ? parseFloat(newPatient.value) : undefined,
        })
      })

      if (response.ok) {
        await fetchPatients()
        setNewPatient({ name: "", phone: "", lastVisit: "", procedure: "", value: "" })
        setShowAddModal(false)
        showToast("Paciente adicionado com sucesso!")
      } else {
        const data = await response.json()
        showToast(data.error || "Erro ao adicionar paciente")
      }
    } catch (error) {
      console.error('Erro ao adicionar paciente:', error)
      showToast("Erro ao adicionar paciente")
    }
  }

  const handleCSVImport = async () => {
    if (!csvFile) return

    // Verificar extensão permitida
    const extensao = csvFile.name.split(".").pop()?.toLowerCase()
    if (!["csv", "xlsx", "xls"].includes(extensao ?? "")) {
      showToast("Formato não suportado. Use CSV ou Excel (.xlsx, .xls)")
      return
    }

    try {
      // Parsear o arquivo (CSV ou Excel)
      const pacientes = await parsearArquivoPacientes(csvFile)

      console.log(`✅ ${pacientes.length} pacientes parseados`)

      if (pacientes.length === 0) {
        showToast(
          "Nenhum paciente encontrado no arquivo.\n\n" +
          "Verifique se o arquivo tem as colunas: nome, telefone, ultima_consulta"
        )
        return
      }

      const response = await fetch('/api/pacientes/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacientes })
      })

      if (response.ok) {
        const data = await response.json()
        setImportSummary(data)
        await fetchPatients()
        showToast(`✅ ${data.importados} pacientes importados\n⚠️ ${data.incompletos} ignorados por dados incompletos\n🔁 ${data.duplicados} ignorados por telefone duplicado`)
      } else {
        const data = await response.json()
        showToast(data.error || "Erro ao importar pacientes")
      }
    } catch (error) {
      console.error('Erro ao importar pacientes:', error)
      showToast(
        "Erro ao processar o arquivo.\n\n" +
        "Verifique se as colunas estão corretas: nome, telefone, ultima_consulta"
      )
    }
  }

  const handleBaixarModelo = () => {
    const conteudo = [
      "nome;telefone;ultima_consulta;valor_ticket",
      "Maria Silva;47999999999;15/03/2024;300",
      "João Santos;11988888888;20/01/2024;250"
    ].join("\n")

    const blob = new Blob(
      ["\uFEFF" + conteudo],
      { type: "text/csv;charset=utf-8;" }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "modelo_pacientes.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Left Sidebar */}
      <aside className="w-60 bg-[#0F3460] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="DentalReativa" width={40} height={40} className="object-contain brightness-0 invert" />
            <span className="text-lg font-semibold text-white">DentalReativa</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
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

        {/* Bottom Section */}
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
                {userName[0].toUpperCase()}
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

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Título e subtítulo da página (fora do card) */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#1E293B]">Pacientes</h1>
          <p className="text-sm text-[#64748B] mt-1">Gerencie sua base de pacientes e acompanhe o retorno</p>
        </div>

        {/* Card container branco com borda */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex-1 flex flex-col min-h-0">
          {/* LINHA 1: Título + botões de ação */}
          <div className="flex items-center justify-between px-6 pt-6 mb-4">
            <h2 className="text-lg font-semibold text-[#1E293B]">Lista de pacientes</h2>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="h-10 px-4 border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar pacientes
              </Button>
              <Button 
                onClick={() => setShowAddModal(true)}
                className="h-10 px-4 bg-[#0F3460] hover:bg-[#0F3460]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo paciente
              </Button>
            </div>
          </div>

          {/* LINHA 2: Barra de busca (largura total) */}
          <div className="px-6 mb-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
              <Input 
                placeholder="Buscar por nome ou telefone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 h-11 bg-white border-[#E2E8F0] text-sm rounded-lg focus:border-[#0F3460] focus:ring-[#0F3460]/20"
              />
            </div>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value as any)}
              className="h-11 pl-3 pr-8 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] appearance-none cursor-pointer"
            >
              <option value="todos">Todos os períodos</option>
              <option value="ate6m">Últimos 6 meses</option>
              <option value="6a12m">6 a 12 meses</option>
              <option value="mais1a">Mais de 1 ano</option>
            </select>
          </div>

          {/* LINHA 3: Abas de filtro */}
          <div className="px-6 flex items-center gap-1 border-b border-[#E2E8F0] mb-6 overflow-x-auto">
            {tabFilters.map((tab) => {
              const isActive = activeTab === tab.key
              const count = tabCounts[tab.key] || 0
              const isRisk = tab.key === "em_risco"
              
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1) }}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                    isActive 
                      ? "text-[#0F3460] border-[#0F3460]" 
                      : "text-[#64748B] border-transparent hover:text-[#1E293B]"
                  }`}
                >
                  {tab.label} <span className={isRisk && !isActive ? "text-[#EF4444]" : ""}>({count})</span>
                </button>
              )
            })}
          </div>

          {/* Bulk Selection Bar */}
          {selectedPatients.length > 0 && (
            <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-3 flex items-center justify-between">
              <span className="text-sm text-[#1D4ED8] font-medium">
                {selectedPatients.length} pacientes selecionados
              </span>
              <div className="flex items-center gap-3">
              <Button onClick={handleBulkPacienteVoltou} className="bg-[#10B981] hover:bg-[#059669] text-white">
                ✅ Paciente voltou
              </Button>
              <button 
                onClick={() => setSelectedPatients([])}
                className="text-xs text-[#64748B] hover:text-[#1E293B]"
              >
                Desmarcar todos
              </button>
            </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-auto px-6 flex-1">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3 text-left" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Última consulta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider cursor-pointer" onClick={() => handleSort("daysSinceVisit")}>
                      <span className="flex items-center gap-1">
                        Dias sem voltar
                        {sortField === "daysSinceVisit" ? (
                          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-30" />
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider cursor-pointer" onClick={() => handleSort("avgTicket")}>
                      <span className="flex items-center gap-1">
                        Ticket médio
                        {sortField === "avgTicket" ? (
                          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-30" />
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <p className="text-[#64748B]">Carregando pacientes...</p>
                      </td>
                    </tr>
                  ) : paginatedPatients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <Search className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#1E293B] font-medium">Nenhum paciente encontrado</p>
                        <p className="text-sm text-[#64748B] mt-1">Tente buscar por outro nome ou telefone</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPatients.map((patient) => {
                      const status = statusConfig[patient.status as PatientStatus] ?? { label: "Desconhecido", bgColor: "bg-[#F8FAFC]", textColor: "text-[#475569]" }
                      return (
                        <tr key={patient.id} className="hover:bg-[#F8FAFC] transition-colors h-16">
                          <td className="px-4 py-3">
                            <input
                              type="radio"
                              name="selectedPatient"
                              checked={selectedPatients.includes(patient.id)}
                              onChange={() => setSelectedPatients([patient.id])}
                              className="w-4 h-4 accent-[#0F3460] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${patient.avatarColor ?? "bg-[#3B82F6]"} text-white text-xs font-semibold`}>
                                {patient.name ? patient.name.split(" ").filter(n => n[0]).map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?"}
                              </div>
                              <span className="text-sm font-semibold text-[#1E293B] hover:text-[#0F3460] hover:underline cursor-pointer">
                                {patient.name ?? "Sem nome"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">
                            {patient.phone?.startsWith("incompleto_") ? "—" : patient.phone ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                          <div className="text-sm text-[#64748B]">{patient.lastVisit ?? "—"}</div>
                          {patient.procedimento && (
                            <div className="text-xs text-[#94A3B8] mt-0.5">{patient.procedimento}</div>
                          )}
                        </td>
                          <td className={`px-4 py-3 text-sm ${getDaysColor(patient.daysSinceVisit)}`}>
                            {patient.daysSinceVisit}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#1E293B]">R$ {patient.avgTicket}</td>
                         <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`text-xs font-medium ${status.textColor}`}>
                                {status.label}
                              </span>
                              {patient.dadosIncompletos && (
                                <span className="text-xs font-medium text-[#F59E0B]">
                                  Dados incompletos
                                </span>
                              )}
                              {patient.vaiMarcar && (
                                <span className="text-xs font-medium text-[#0891B2]">
                                  Vai marcar
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                          <div className="flex items-center gap-1 relative">
                            {validarTelefone(patient.phone) && (<a
                              
                                href={gerarLinkWhatsApp(
                                  patient.phone,
                                  (mensagemDireta || `Olá ${patient.name}! Aqui é a ${clinicName}. Tudo bem?`)
                                    .replace(/\[nome\]/g, patient.name)
                                    .replace(/\[clinica\]/g, clinicName)
                                ) ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Enviar mensagem no WhatsApp"
                                className="p-2 rounded-lg hover:bg-[#F0FDF4] transition-colors"
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="#25D366">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.523 5.855L.057 23.428a.75.75 0 0 0 .916.916l5.573-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.696-.534-5.218-1.457l-.374-.223-3.879 1.021 1.021-3.879-.223-.374A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                </svg>
                              </a>
                            )}
                              <button
                                onClick={() => handleOpenEdit(patient)}
                                className="p-2 rounded-lg hover:bg-[#EFF6FF] transition-colors"
                                title="Editar paciente"
                              >
                                <Pencil className="h-4 w-4 text-[#64748B]" />
                              </button>
                              {["contatado", "aguardando_resposta"].includes(patient.status) && (
                                <div className="relative">
                                  <button
                                    onClick={() => setMenuAcaoPaciente((prev) => ({ ...prev, [patient.id]: !prev[patient.id] }))}
                                    className="p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors text-[#64748B] text-xs font-bold"
                                    title="O que aconteceu?"
                                  >
                                    •••
                                  </button>
                                  {menuAcaoPaciente[patient.id] && (
                                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                                    <button onClick={() => handleAcaoPaciente(patient.id, "recuperado")}
                                      className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:text-[#10B981] flex items-center gap-2 transition-colors">
                                      ✅ Paciente voltou
                                    </button>
                                    <button onClick={() => handleAcaoPaciente(patient.id, "vai_marcar")}
                                      className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:text-[#3B82F6] flex items-center gap-2 transition-colors">
                                      📅 Vai marcar consulta
                                    </button>
                                    <button onClick={() => handleAcaoPaciente(patient.id, "nao_contatar")}
                                      className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:text-[#EF4444] flex items-center gap-2 transition-colors">
                                      🚫 Não quer contato
                                    </button>
                                    <button onClick={() => handleAcaoPaciente(patient.id, "numero_errado")}
                                      className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:text-[#F59E0B] flex items-center gap-2 transition-colors">
                                      ❌ Número errado
                                    </button>
                                  </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs text-[#64748B]">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredPatients.length)} de {filteredPatients.length} pacientes
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B]">Itens por página</span>
                  <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1) }}>
                    <SelectTrigger className="w-16 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-8 px-3 text-xs">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => (
                    <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(page)} className={`h-8 w-8 text-xs ${currentPage === page ? "bg-[#0F3460] text-white" : ""}`}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="h-8 px-3 text-xs">
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div> {/* fecha Table Card */}
        </div> {/* fecha Main Area */}

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
      )}

      {/* Add Patient Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold text-[#1E293B]">Novo paciente</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Nome completo *</label>
              <Input placeholder="Nome do paciente" value={newPatient.name} onChange={(e) => setNewPatient(prev => ({ ...prev, name: e.target.value }))} className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Telefone *</label>
              <Input placeholder="(11) 99999-9999" value={newPatient.phone} onChange={(e) => setNewPatient(prev => ({ ...prev, phone: formatPhoneInput(e.target.value) }))} className="h-11" maxLength={15} />
              {newPatient.phone && !validarTelefone(newPatient.phone) && (
                <p className="text-xs text-[#EF4444] mt-1">Número inválido. Digite DDD + 8 ou 9 dígitos.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Data da última consulta *</label>
              <input
                type="date"
                value={newPatient.lastVisit}
                onChange={(e) => setNewPatient(prev => ({ ...prev, lastVisit: e.target.value }))}
                max={new Date().toISOString().split("T")[0]}
                className="w-full h-11 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Procedimento <span className="text-[#94A3B8] font-normal">(opcional)</span></label>
              <Input
                placeholder="Ex: Limpeza, Implante, Canal..."
                value={newPatient.procedure}
                onChange={(e) => setNewPatient(prev => ({ ...prev, procedure: e.target.value }))}
                className="h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Valor da consulta (R$) <span className="text-[#94A3B8] font-normal">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">R$</span>
                <Input
                  placeholder="0,00"
                  type="number"
                  value={newPatient.value}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, value: e.target.value }))}
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-[#E2E8F0] text-[#64748B]">Cancelar</Button>
              <Button
                onClick={handleAddPatient}
                disabled={!newPatient.name || !validarTelefone(newPatient.phone) || !newPatient.lastVisit}
                className="bg-[#0F3460] hover:bg-[#0F3460]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar paciente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b border-[#E2E8F0]">
            <DialogTitle className="text-xl font-bold text-[#1E293B]">Importar pacientes</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-10 text-center cursor-pointer hover:border-[#0F3460] hover:bg-[#F8FAFC] transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
                  <Upload className="h-6 w-6 text-[#64748B]" />
                </div>
                <p className="text-sm font-medium text-[#1E293B]">Clique para selecionar o arquivo</p>
                <p className="text-xs text-[#64748B]">ou arraste e solte aqui</p>
                <p className="text-xs text-[#94A3B8]">Aceita CSV e Excel (.xlsx)</p>
              </div>
              {csvFile && <p className="text-sm text-[#0F3460] mt-2 font-medium">{csvFile?.name}</p>}
              {importSummary && (
                <div className="mt-4 p-3 bg-[#F0FDF4] rounded-lg text-sm">
                  <p className="text-[#166534] font-medium">Resumo da importação:</p>
                  <p className="text-[#166534] mt-1">✅ {importSummary?.importados ?? 0} importados</p>
                  <p className="text-[#166534]">⚠️ {importSummary?.incompletos ?? 0} com dados incompletos</p>
                  <p className="text-[#166534]">🔁 {importSummary?.duplicados ?? 0} duplicados ignorados</p>
                </div>
              )}
            </div>
            <button onClick={handleBaixarModelo} className="flex items-center justify-center gap-2 text-sm text-[#0F3460] font-medium hover:underline">
              <Download className="h-4 w-4" />
              Baixar modelo de planilha
            </button>
            <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
              <Button variant="outline" onClick={() => { setShowImportModal(false); setCsvFile(null); setImportSummary(null) }} className="flex-1">Cancelar</Button>
              <Button onClick={handleCSVImport} disabled={!csvFile} className="flex-1 bg-[#0F3460] hover:bg-[#0D2A4D] text-white">Importar pacientes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) { setShowEditModal(false); setEditingPatient(null) } }}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold text-[#1E293B]">Editar paciente</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Nome completo</label>
              <Input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Telefone</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: formatPhoneInput(e.target.value) }))} className="h-11" maxLength={15} />
              {editForm.phone && !validarTelefone(editForm.phone) && (
                <p className="text-xs text-[#EF4444] mt-1">Número inválido. Digite DDD + 8 ou 9 dígitos.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Data da última consulta</label>
              <input
                type="date"
                value={editForm.lastVisit}
                onChange={(e) => setEditForm(prev => ({ ...prev, lastVisit: e.target.value }))}
                max={new Date().toISOString().split("T")[0]}
                className="w-full h-11 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Procedimento <span className="text-[#94A3B8] font-normal">(opcional)</span></label>
              <Input placeholder="Ex: Limpeza, Implante..." value={editForm.procedure} onChange={(e) => setEditForm(prev => ({ ...prev, procedure: e.target.value }))} className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Valor da consulta (R$) <span className="text-[#94A3B8] font-normal">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">R$</span>
                <Input placeholder="0,00" type="number" value={editForm.value} onChange={(e) => setEditForm(prev => ({ ...prev, value: e.target.value }))} className="h-11 pl-9" />
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => {
                  setDeletingPatient(editingPatient)
                  setShowEditModal(false)
                  setShowDeleteConfirm(true)
                }}
                className="flex items-center gap-2 text-sm text-[#EF4444] hover:text-[#DC2626] font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir paciente
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingPatient(null) }} className="border-[#E2E8F0] text-[#64748B]">Cancelar</Button>
                <Button onClick={handleSaveEdit} className="bg-[#0F3460] hover:bg-[#0F3460]/90 text-white">Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-[#EF4444]" />
            </div>
            <h3 className="text-base font-bold text-[#1E293B] text-center mb-2">Excluir paciente?</h3>
            <p className="text-sm text-[#64748B] text-center mb-6">
              Essa ação não pode ser desfeita. Todo o histórico de envios de <strong>{deletingPatient?.name}</strong> também será removido.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleDeletePatient} className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white">Excluir</Button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-6 right-6 bg-[#10B981] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
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
