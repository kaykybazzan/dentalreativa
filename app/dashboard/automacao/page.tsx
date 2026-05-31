"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Search,
  CheckCircle,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/sidebar"
import { ModalVaiMarcar } from "@/components/modal-vai-marcar"
import { gerarLinkWhatsApp, formatarTelefoneExibicao, validarTelefone } from "@/lib/formatarTelefone"

interface PacienteFila {
  id: string
  nome: string
  telefone: string
  ultimaConsulta: string
  diasSemConsulta: number
  nivelRisco: string
  valorTicket: number
  status: string
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

export default function AutomacaoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeNav, setActiveNav] = useState("automation")

  const [fila, setFila] = useState<PacienteFila[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState<Record<string, boolean>>({})
  const [enviados, setEnviados] = useState<Record<string, boolean>>({})
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState<Record<string, boolean>>({})
  const [menuAcoes, setMenuAcoes] = useState<Record<string, boolean>>({})

  // Modal Vai Marcar
  const [modalVaiMarcarAberto, setModalVaiMarcarAberto] = useState(false)
  const [pacienteModalVaiMarcar, setPacienteModalVaiMarcar] = useState<PacienteFila | null>(null)

  const [message1, setMessage1] = useState("")
  const [message2, setMessage2] = useState("")
  const [message3, setMessage3] = useState("")

  const [sortBy, setSortBy] = useState<"urgency" | "value">("urgency")
  const [showOnlyUnsent, setShowOnlyUnsent] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const [filterAttempt, setFilterAttempt] = useState<"all" | "1" | "2" | "3">("all")
  const [filterProcedures, setFilterProcedures] = useState<string[]>([])
  const [filterMinValue, setFilterMinValue] = useState("")
  const [filterMaxValue, setFilterMaxValue] = useState("")
  const [filterMinDays, setFilterMinDays] = useState("")

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

  const filteredAndSortedPatients = fila
    .filter((p) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const nomeMatch = p.nome?.toLowerCase().includes(q)
        const telefoneMatch = p.telefone?.includes(q)
        if (!nomeMatch && !telefoneMatch) return false
      }
      if (activeFilterAttempt !== "all" && p.attempt !== activeFilterAttempt) return false
      if (activeFilterProcedures.length > 0 && !activeFilterProcedures.includes(p.procedure)) return false
      if (activeFilterMinValue !== "" && p.valorTicket < parseFloat(activeFilterMinValue)) return false
      if (activeFilterMaxValue !== "" && p.valorTicket > parseFloat(activeFilterMaxValue)) return false
      if (activeFilterMinDays !== "" && p.diasSemConsulta < parseInt(activeFilterMinDays)) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "urgency") return b.diasSemConsulta - a.diasSemConsulta
      if (sortBy === "value") return b.valorTicket - a.valorTicket
      return 0
    })

  useEffect(() => {
    if (typeof window !== "undefined") {
      carregarFila()
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/api/mensagens")
        .then((res) => res.json())
        .then((data) => {
          setMessage1(data.mensagem1 ?? "")
          setMessage2(data.mensagem2 ?? "")
          setMessage3(data.mensagem3 ?? "")
        })
        .catch((error) => console.error("Erro ao carregar mensagens:", error))
    }
  }, [session?.user?.email])

  const handleLogout = () => {
    router.push("/")
  }

  const carregarFila = async () => {
    setCarregando(true)
    try {
      const response = await fetch("/api/pacientes/fila")
      if (response.ok) {
        const data = await response.json()
        const mappedFila = data.map((p: any) => {
          const avatarColors = ["bg-[#3B82F6]", "bg-[#10B981]", "bg-[#8B5CF6]", "bg-[#F59E0B]", "bg-[#EF4444]"]
          const avatarColor = avatarColors[p.nome.length % avatarColors.length]
          const initials = p.nome?.split(" ")?.map((n: string) => n?.[0])?.join("")?.slice(0, 2)?.toUpperCase() ?? ""
          const ultimaConsulta = p.ultimaConsulta ? new Date(p.ultimaConsulta) : null
          const lastVisit = ultimaConsulta ? ultimaConsulta.toLocaleDateString?.('pt-BR') ?? '' : ''

          const attemptNum =
            p.proximaTentativa >= 1 &&
            p.proximaTentativa <= 3
              ? p.proximaTentativa
              : 1
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
        })
        setFila(mappedFila)

        // Não assumir envio automaticamente.
        // O botão "O que aconteceu?" só aparece
        // depois do usuário confirmar o envio.
        setEnviados({})
      }
    } catch (error) {
      console.error("Erro ao carregar fila:", error)
    } finally {
      setCarregando(false)
    }
  }

  const handleEnviarWhatsApp = async (paciente: PacienteFila) => {
    if (enviando[paciente.id]) return
    setEnviando((prev) => ({ ...prev, [paciente.id]: true }))

    try {
      const msgRes = await fetch(`/api/envios/mensagem?pacienteId=${paciente.id}`)
      const { mensagem, tentativa } = await msgRes.json()

      const linkWhatsApp = gerarLinkWhatsApp(paciente.telefone, mensagem)

      if (!linkWhatsApp) {
        alert(`Número inválido para ${paciente.nome}: ${paciente.telefone}`)
        setEnviando((prev) => ({ ...prev, [paciente.id]: false }))
        return
      }

      window.open(linkWhatsApp, "_blank")
      setAguardandoConfirmacao((prev) => ({ ...prev, [paciente.id]: true }))
      setEnviando((prev) => ({ ...prev, [paciente.id]: false }))
    } catch (error) {
      console.error("Erro ao enviar:", error)
      setEnviando((prev) => ({ ...prev, [paciente.id]: false }))
    }
  }

  const handleConfirmarEnvio = async (paciente: PacienteFila) => {
  try {
    const res = await fetch("/api/envios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pacienteId: paciente.id }),
    })
    if (!res.ok) {
      console.error("Erro ao confirmar envio:", await res.json())
      return
    }
    // Remove da fila imediatamente — a API já mudou o status do paciente
    // então ele não aparecerá mais na próxima carga da fila
    setFila((prev) => prev.filter((p) => p.id !== paciente.id))
    setAguardandoConfirmacao((prev) => {
      const novo = { ...prev }
      delete novo[paciente.id]
      return novo
    })
  } catch (error) {
    console.error("Erro ao confirmar envio:", error)
  }
}

  const handleCancelarEnvio = (pacienteId: string) => {
    setAguardandoConfirmacao((prev) => ({ ...prev, [pacienteId]: false }))
  }

  const handlePacienteVoltou = async (paciente: PacienteFila) => {
    // Usa estimatedValue como fallback pois valorTicket pode estar zerado
    const valorBase = paciente.estimatedValue > 0
      ? paciente.estimatedValue
      : paciente.valorTicket

    const valorStr = window.prompt(
      `Qual o valor da consulta de ${paciente.name}?\n(deixe em branco para usar R$ ${valorBase.toFixed(2).replace(".", ",")})`
    )
    if (valorStr === null) return

    const valor = valorStr.trim() === ""
      ? valorBase
      : parseFloat(valorStr.replace(",", "."))

    if (isNaN(valor)) {
      alert("Valor inválido. Tente novamente.")
      return
    }

    try {
      await fetch("/api/envios/recuperado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId: paciente.id, valorRecuperado: valor }),
      })
      setFila((prev) => prev.filter((p) => p.id !== paciente.id))
      setEnviados((prev) => {
        const novo = { ...prev }
        delete novo[paciente.id]
        return novo
      })
    } catch (error) {
      console.error("Erro ao marcar como recuperado:", error)
    }
  }

  const handleVaiMarcar = (paciente: PacienteFila) => {
    setMenuAcoes((prev) => ({ ...prev, [paciente.id]: false }))
    setPacienteModalVaiMarcar(paciente)
    setModalVaiMarcarAberto(true)
  }

  const handleConfirmarVaiMarcar = async (dados: {
    pacienteId: string | number
    dataConsulta?: string
    horario?: string
    procedimento?: string
  }) => {
    try {
      await fetch("/api/envios/recuperado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId: dados.pacienteId,
          acao: "vai_marcar",
          dataConsulta: dados.dataConsulta,
          horario: dados.horario,
          procedimento: dados.procedimento,
        }),
      })

      setFila((prev) => prev.filter((p) => p.id !== dados.pacienteId))
      setModalVaiMarcarAberto(false)
      setPacienteModalVaiMarcar(null)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleNaoContatar = async (paciente: PacienteFila) => {
    setMenuAcoes((prev) => ({ ...prev, [paciente.id]: false }))
    if (!confirm(`Marcar ${paciente.name} como "Não contatar"? Ele sairá da fila permanentemente.`)) return
    try {
      await fetch("/api/envios/recuperado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId: paciente.id, acao: "nao_contatar" }),
      })
      setFila((prev) => prev.filter((p) => p.id !== paciente.id))
    } catch (error) {
      console.error(error)
    }
  }

  const handleNumeroErrado = async (paciente: PacienteFila) => {
    setMenuAcoes((prev) => ({ ...prev, [paciente.id]: false }))
    try {
      await fetch("/api/envios/recuperado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId: paciente.id, acao: "numero_errado" }),
      })
      setFila((prev) => prev.filter((p) => p.id !== paciente.id))
    } catch (error) {
      console.error(error)
    }
  }

  const getDaysSinceColor = (nivelRisco: string) => {
  if (nivelRisco === "critico") return "text-[#EF4444]"
  if (nivelRisco === "alto")    return "text-[#F97316]"
  if (nivelRisco === "medio")   return "text-[#F59E0B]"
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
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#1E293B]">Central de Envios</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  placeholder="Buscar pacientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-56 pl-9 pr-3 rounded-lg border border-[#E2E8F0] text-sm bg-[#F8FAFC] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[rgba(15,52,96,0.12)] focus:border-[#0F3460]"
                />
              </div>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-sm text-[#64748B]">Veja quem precisa de contato hoje e envie mensagens com 1 clique pelo WhatsApp.</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">Fila de hoje</h2>
                <p className="text-sm text-[#64748B]">Pacientes identificados pelo sistema para contato agora</p>
              </div>
              <span className="inline-block bg-[#0F3460] text-white px-4 py-2 rounded-full text-sm font-medium">
                {carregando ? "..." : `${filteredAndSortedPatients.length} pacientes aguardando contato`}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-4">
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

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "urgency" | "value")}
                className="h-9 pl-3 pr-8 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] appearance-none cursor-pointer"
              >
                <option value="urgency">Mais urgente primeiro</option>
                <option value="value">Maior valor primeiro</option>
              </select>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="text-sm text-[#EF4444] hover:underline ml-auto">
                  Limpar todos os filtros
                </button>
              )}
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-3 grid gap-3 text-xs uppercase text-[#64748B] font-medium tracking-wider" style={{gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr'}}>
                <div>Nome</div>
                <div>Última consulta</div>
                <div>Dias sem voltar</div>
                <div>Tentativa</div>
                <div>Procedimento</div>
                <div>Valor est.</div>
                <div>Ação</div>
              </div>

              {filteredAndSortedPatients.map((patient) => (
                <div key={patient.id}>
                  <div className={`border-b border-[#F1F5F9] px-6 py-5 grid gap-3 hover:bg-[#F8FAFC] transition-colors ${aguardandoConfirmacao[patient.id] ? 'items-start' : 'items-center'}`} style={{gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr'}}>
                    <div className="flex items-center gap-3">
                      <div className={`${patient.avatarColor ?? "bg-[#3B82F6]"} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                        {patient.avatar ?? ""}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1E293B]">{patient.name ?? "-"} <span className="text-xs font-normal text-[#64748B]">({patient.attemptLabel ?? "1ª"} tentativa)</span></p>
                        {patient.attempt === "3" && (
                          <p className="text-sm text-[#EF4444] font-medium">⚠️ Última chance</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#64748B]">
                            {formatarTelefoneExibicao(patient.phone) ?? "-"}
                          </span>
                          {!validarTelefone(patient.phone) && (
                            <span className="text-xs bg-[#FEF2F2] text-[#EF4444] px-2 py-0.5 rounded-full font-medium">
                              Número inválido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-[#64748B]">{patient.lastVisit ?? "-"}</p>
                    </div>

                    <div>
                      <p className={`text-sm font-bold ${getDaysSinceColor(patient.nivelRisco ?? "ok")}`}>
                        {patient.daysSince ?? 0} dias
                      </p>
                    </div>

                    <div>
                      <span className={`inline-block ${patient.attemptBg ?? "bg-[#EFF6FF]"} ${patient.attemptText ?? "text-[#1D4ED8]"} px-2 py-1 rounded text-xs font-medium`}>
                        {patient.attemptLabel ?? "1ª"} tentativa
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-[#64748B]">{patient.procedure ?? "-"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">
                        {patient.estimatedValue?.toLocaleString?.('pt-BR', { style: 'currency', currency: 'BRL' }) ?? "R$ 0,00"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {aguardandoConfirmacao[patient.id] ? (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm text-[#92400E] font-medium">Você enviou?</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleConfirmarEnvio(patient)}
                              className="bg-[#10B981] text-white text-sm font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#059669] transition-colors"
                            >
                              ✓ Sim
                            </button>
                            <button
                              onClick={() => handleCancelarEnvio(patient.id)}
                              className="text-sm text-[#64748B] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      ) : enviados[patient.id] ? (
                        <div className="flex items-center gap-2 relative">
                          <div className="flex items-center gap-1 text-[#10B981]">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-sm font-medium">Enviado</span>
                          </div>
                          <span className="text-[#CBD5E1]">·</span>
                          <button
                            onClick={() => setMenuAcoes((prev) => ({ ...prev, [patient.id]: !prev[patient.id] }))}
                            className="text-sm text-[#64748B] hover:text-[#1E293B] underline underline-offset-2 transition-colors"
                          >
                            O que aconteceu? ▾
                          </button>
                          {menuAcoes[patient.id] && (
                            <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                              <button onClick={() => handlePacienteVoltou(patient)}
                                className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:bg-[#F0FDF4] flex items-center gap-2">
                                ✅ Paciente voltou
                              </button>
                              <button onClick={() => handleVaiMarcar(patient)}
                                className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:bg-[#EFF6FF] flex items-center gap-2">
                                📅 Vai marcar consulta
                              </button>
                              <button onClick={() => handleNaoContatar(patient)}
                                className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:bg-[#FEF2F2] flex items-center gap-2">
                                🚫 Não quer contato
                              </button>
                              <button onClick={() => handleNumeroErrado(patient)}
                                className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:bg-[#FEFCE8] flex items-center gap-2">
                                ❌ Número errado
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleEnviarWhatsApp(patient)}
                          disabled={enviando[patient.id] || enviados[patient.id] || !validarTelefone(patient.phone)}
                          className={`bg-[#25D366] hover:bg-[#1fad52] text-white text-sm h-8 px-3 flex items-center gap-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${!validarTelefone(patient.phone) ? "opacity-40 cursor-not-allowed" : ""}`}
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
                </div>
              ))}

              {filteredAndSortedPatients.length === 0 && (
                <div className="py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9] mx-auto mb-3">
                    <SlidersHorizontal className="h-6 w-6 text-[#94A3B8]" />
                  </div>
                  <p className="text-sm font-medium text-[#1E293B]">Nenhum paciente encontrado</p>
                  <p className="text-xs text-[#64748B] mt-1">Tente ajustar ou limpar os filtros</p>
                  <button onClick={handleClearFilters} className="mt-3 text-sm text-[#0F3460] hover:underline font-medium">
                    Limpar todos os filtros
                  </button>
                </div>
              )}

              <div className="bg-white px-6 py-5 border-t border-[#E2E8F0] flex items-center justify-between">
                <p className="text-xs text-[#64748B]">
                  Mostrando {filteredAndSortedPatients.length} de {fila.length} pacientes
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/pacientes")}
                  className="text-[#0F3460] border-[#0F3460] hover:bg-[#0F3460] hover:text-white text-xs h-8"
                >
                  Ver todos os {fila.length} pacientes
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#1E293B]">Mensagens configuradas</h2>
              <p className="text-sm text-[#64748B]">
                Edite os textos em{" "}
                <button onClick={() => router.push("/dashboard/configuracoes")} className="text-[#0F3460] hover:underline font-medium">
                  Configurações
                </button>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="bg-white border border-l-4 border-l-[#3B82F6] border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <span className="inline-block bg-[#EFF6FF] text-[#1D4ED8] px-3 py-1 rounded-full text-xs font-medium mb-2">1ª tentativa</span>
                <p className="text-xs text-[#64748B] italic mb-3">Enviar assim que entrar na fila</p>
                <Textarea value={message1} readOnly className="w-full h-24 text-sm border-[#E2E8F0] bg-[#F8FAFC] resize-none mb-2 cursor-default" />
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">{message1.length}/500</span>
                </div>
              </div>

              <div className="bg-white border border-l-4 border-l-[#F59E0B] border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <span className="inline-block bg-[#FFFBEB] text-[#92400E] px-3 py-1 rounded-full text-xs font-medium mb-2">2ª tentativa</span>
                <p className="text-xs text-[#64748B] italic mb-3">Enviar após <strong>3 dias</strong> sem resposta</p>
                <Textarea value={message2} readOnly className="w-full h-24 text-sm border-[#E2E8F0] bg-[#F8FAFC] resize-none mb-2 cursor-default" />
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">{message2.length}/500</span>
                </div>
              </div>

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

      {showFilterPanel && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowFilterPanel(false)} />
      )}

      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${showFilterPanel ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Filtros avançados</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Refine a lista de pacientes</p>
          </div>
          <button onClick={() => setShowFilterPanel(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F8FAFC] text-[#64748B] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
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

          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Valor estimado da consulta</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-[#64748B] mb-1 block">De</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">R$</span>
                  <input type="number" placeholder="0" value={filterMinValue} onChange={(e) => setFilterMinValue(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]" />
                </div>
              </div>
              <span className="text-[#94A3B8] mb-2">—</span>
              <div className="flex-1">
                <label className="text-xs text-[#64748B] mb-1 block">Até</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">R$</span>
                  <input type="number" placeholder="9999" value={filterMaxValue} onChange={(e) => setFilterMaxValue(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { label: "Até R$ 500", min: "", max: "500" },
                { label: "R$ 500–2000", min: "500", max: "2000" },
                { label: "Acima R$ 2000", min: "2000", max: "" },
              ].map((preset) => (
                <button key={preset.label} onClick={() => { setFilterMinValue(preset.min); setFilterMaxValue(preset.max) }}
                  className="text-xs px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] transition-colors">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E2E8F0]" />

          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Dias sem consulta</p>
            <div>
              <label className="text-xs text-[#64748B] mb-1 block">Mínimo de dias</label>
              <input type="number" placeholder="Ex: 180" value={filterMinDays} onChange={(e) => setFilterMinDays(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]" />
            </div>
            <div className="flex gap-2 mt-2">
              {[
                { label: "+120 dias", value: "120" },
                { label: "+180 dias", value: "180" },
                { label: "+365 dias", value: "365" },
              ].map((preset) => (
                <button key={preset.label} onClick={() => setFilterMinDays(preset.value)}
                  className="text-xs px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] transition-colors">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

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
          <button onClick={handleApplyFilters} className="flex-1 h-10 rounded-lg bg-[#0F3460] text-white text-sm font-medium hover:bg-[#0A2540] transition-colors">
            Aplicar filtros
          </button>
        </div>
      </div>

      <ModalVaiMarcar
        aberto={modalVaiMarcarAberto}
        paciente={pacienteModalVaiMarcar ? {
          id: pacienteModalVaiMarcar.id,
          nome: pacienteModalVaiMarcar.name,
          procedimento: pacienteModalVaiMarcar.procedure,
        } : null}
        onFechar={() => {
          setModalVaiMarcarAberto(false)
          setPacienteModalVaiMarcar(null)
        }}
        onConfirmar={handleConfirmarVaiMarcar}
      />
    </div>
  )
}