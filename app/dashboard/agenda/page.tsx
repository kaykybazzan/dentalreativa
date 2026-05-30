"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { CheckCircle, X, CalendarDays, MoreHorizontal } from "lucide-react"

type StatusAgendamento = "agendado" | "confirmado" | "compareceu" | "nao_compareceu" | "cancelado"

type AgendaItem = {
  id: string
  tipo: "consulta"
  pacienteId: number
  pacienteNome: string
  pacienteTelefone: string
  dataReferencia: string
  motivo: string
  horario: string | null
  procedimento: string | null
  agendamentoId: number | null
  statusAgendamento: StatusAgendamento | null
}

function toLocalISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function adicionarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split("-").map(Number)
  const dt = new Date(a, m - 1, d)
  dt.setDate(dt.getDate() + dias)
  return toLocalISO(dt)
}

function formatarBR(iso: string) {
  const [a, m, d] = iso.split("-")
  return `${d}/${m}/${a}`
}

function gerarWA(tel: string | null | undefined, msg: string) {
  if (!tel) return null
  const d = tel.replace(/\D/g, "")
  if (d.length < 10) return null
  const c = d.startsWith("55") ? d : `55${d}`
  return `https://wa.me/${c}?text=${encodeURIComponent(msg)}`
}

export default function AgendaPage() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("agenda")
  const [itens, setItens] = useState<AgendaItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<"hoje" | "semana" | "calendario">("hoje")
  const [menuAberto, setMenuAberto] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [modalCompareceu, setModalCompareceu] = useState<{
    item: AgendaItem
    valor: string
  } | null>(null)

  const hojeStr = toLocalISO(new Date())
  const seteDiasStr = adicionarDias(hojeStr, 7)
  const amanhaStr = adicionarDias(hojeStr, 1)

  const mostrarToast = (msg: string, ok = true) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, ok })
    timerRef.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch("/api/agendamentos", { cache: "no-store" })
      if (res.ok) setItens(await res.json())
    } catch {}
    finally { setCarregando(false) }
  }

  useEffect(() => { carregar() }, [])

  const itensHoje = useMemo(
    () => itens.filter(i => i.dataReferencia <= hojeStr),
    [itens, hojeStr]
  )

  const itensSemana = useMemo(
    () => itens.filter(i => i.dataReferencia > hojeStr && i.dataReferencia <= seteDiasStr),
    [itens, hojeStr]
  )

  // Lógica do calendário
  const diasCalendario = useMemo(() => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const primeiroDia = new Date(ano, mes, 1)
    const ultimoDia = new Date(ano, mes + 1, 0)
    const diaSemanaInicio = primeiroDia.getDay()
    const totalDias = ultimoDia.getDate()

    const dias: Array<{ data: string; dia: number; consultas: AgendaItem[] }> = []

    // Dias vazios antes do primeiro dia do mês
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push({ data: "", dia: 0, consultas: [] })
    }

    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      const dataStr = toLocalISO(new Date(ano, mes, d))
      const consultasDia = itens.filter(i => i.dataReferencia === dataStr)
      dias.push({ data: dataStr, dia: d, consultas: consultasDia })
    }

    return dias
  }, [mesAtual, itens])

  const itensDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return []
    return itens.filter(i => i.dataReferencia === diaSelecionado)
  }, [diaSelecionado, itens])

  const mesNome = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  // Grupos por data para aba semana
  const gruposSemana = useMemo(() => {
    const mapa: Record<string, AgendaItem[]> = {}
    for (const item of itensSemana) {
      if (!mapa[item.dataReferencia]) mapa[item.dataReferencia] = []
      mapa[item.dataReferencia].push(item)
    }
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b))
  }, [itensSemana])

  // Strip 7 dias
  const diasStrip = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const str = toLocalISO(d)
      return {
        str,
        dia: d.getDate(),
        nome: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(),
        consultas: itens.filter(it => it.dataReferencia === str).length,
        atrasadas: itens.filter(it => it.dataReferencia === str && it.dataReferencia < hojeStr).length,
      }
    }),
    [itens, hojeStr]
  )

  const removerItem = (id: string) => setItens(prev => prev.filter(i => i.id !== id))

  const executar = async (item: AgendaItem, fn: () => Promise<boolean>) => {
    setMenuAberto(p => ({ ...p, [item.id]: false }))
    const ok = await fn()
    if (ok) removerItem(item.id)
  }

  const handleCompareceu = (item: AgendaItem) => {
    setModalCompareceu({ item, valor: "" })
  }

  const handleConfirmarCompareceu = async () => {
    if (!modalCompareceu) return
    const { item, valor } = modalCompareceu
    setModalCompareceu(null)
    await executar(item, async () => {
      const res = await fetch(`/api/agendamentos/${item.agendamentoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "compareceu",
          valorConsulta: valor.trim() ? parseFloat(valor.replace(",", ".")) : null,
        }),
      })
      res.ok
        ? mostrarToast("Paciente recuperado!")
        : mostrarToast("Erro ao atualizar.", false)
      return res.ok
    })
  }

  const handleNaoCompareceu = (item: AgendaItem) =>
    executar(item, async () => {
      const res = await fetch(`/api/agendamentos/${item.agendamentoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "nao_compareceu" }),
      })
      res.ok ? mostrarToast("Devolvido à fila de reativação.") : mostrarToast("Erro ao atualizar.", false)
      return res.ok
    })

  const handleCancelar = (item: AgendaItem) =>
    executar(item, async () => {
      const res = await fetch(`/api/agendamentos/${item.agendamentoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelado" }),
      })
      res.ok ? mostrarToast("Agendamento cancelado.") : mostrarToast("Erro ao cancelar.", false)
      return res.ok
    })

  return (
    <>
    <div className="flex h-screen bg-[#F8FAFC]">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg ${toast.ok ? "bg-[#10B981]" : "bg-[#EF4444]"}`}>
          {toast.ok ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} onLogout={() => router.push("/")} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-[#1E293B]">Agenda</h1>
            <p className="text-sm text-[#64748B]">Consultas marcadas pela Central de Envios</p>
          </div>
          <div className="flex rounded-lg border border-[#E2E8F0] overflow-hidden text-sm">
            <button
              onClick={() => setAba("hoje")}
              className={`px-4 py-1.5 font-medium transition-colors ${aba === "hoje" ? "bg-[#0F3460] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}
            >
              Hoje{itensHoje.length > 0 ? ` (${itensHoje.length})` : ""}
            </button>
            <button
              onClick={() => setAba("semana")}
              className={`px-4 py-1.5 font-medium transition-colors ${aba === "semana" ? "bg-[#0F3460] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}
            >
              Esta semana{itensSemana.length > 0 ? ` (${itensSemana.length})` : ""}
            </button>
            <button
              onClick={() => setAba("calendario")}
              className={`px-4 py-1.5 font-medium transition-colors ${aba === "calendario" ? "bg-[#0F3460] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}
            >
              Calendário
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {/* Strip 7 dias */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6">
            <div className="flex gap-2">
              {diasStrip.map(d => (
                <button
                  key={d.str}
                  onClick={() => setAba(d.str <= hojeStr ? "hoje" : "semana")}
                  className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${d.str === hojeStr ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"}`}
                >
                  <span className="text-[10px] font-medium text-[#94A3B8] mb-1">{d.nome}</span>
                  <span className={`text-sm font-semibold ${d.str === hojeStr ? "text-[#0F3460]" : "text-[#1E293B]"}`}>
                    {d.dia}
                  </span>
                  <div className="flex gap-1 mt-1.5 min-h-[8px] items-center">
                    {Array.from({ length: Math.min(d.consultas, 3) }).map((_, i) => (
                      <span key={i} className="w-2 h-2 rounded-full bg-[#378ADD]" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F1F5F9]">
              <span className="text-xs text-[#94A3B8]">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#378ADD]" />
                <span className="text-xs text-[#64748B]">Consulta agendada</span>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          {carregando ? (
            <div className="py-16 text-center text-sm text-[#94A3B8]">Carregando...</div>
          ) : aba === "hoje" ? (
            itensHoje.length === 0 ? (
              <EmptyState msg="Nenhuma consulta para hoje." />
            ) : (
              <SecaoConsultas
                titulo="Hoje"
                itens={itensHoje}
                hojeStr={hojeStr}
                amanhaStr={amanhaStr}
                menuAberto={menuAberto}
                onToggleMenu={(id) => setMenuAberto(p => ({ ...p, [id]: !p[id] }))}
                onCompareceu={handleCompareceu}
                onNaoCompareceu={handleNaoCompareceu}
                onCancelar={handleCancelar}
              />
            )
          ) : aba === "semana" ? (
            itensSemana.length === 0 ? (
              <EmptyState msg="Nenhuma consulta nos próximos 7 dias." />
            ) : (
              <div className="space-y-6">
                {gruposSemana.map(([data, lista]) => (
                  <SecaoConsultas
                    key={data}
                    titulo={data === amanhaStr ? "Amanhã" : formatarBR(data)}
                    itens={lista}
                    hojeStr={hojeStr}
                    amanhaStr={amanhaStr}
                    menuAberto={menuAberto}
                    onToggleMenu={(id) => setMenuAberto(p => ({ ...p, [id]: !p[id] }))}
                    onCompareceu={handleCompareceu}
                    onNaoCompareceu={handleNaoCompareceu}
                onCancelar={handleCancelar}
                  />
                ))}
              </div>
            )
          ) : (
            /* Calendário */
            <div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => {
                      const novo = new Date(mesAtual)
                      novo.setMonth(novo.getMonth() - 1)
                      setMesAtual(novo)
                      setDiaSelecionado(null)
                    }}
                    className="text-[#64748B] hover:text-[#1E293B] transition-colors"
                  >
                    ← Anterior
                  </button>
                  <h2 className="text-lg font-semibold text-[#1E293B] capitalize">{mesNome}</h2>
                  <button
                    onClick={() => {
                      const novo = new Date(mesAtual)
                      novo.setMonth(novo.getMonth() + 1)
                      setMesAtual(novo)
                      setDiaSelecionado(null)
                    }}
                    className="text-[#64748B] hover:text-[#1E293B] transition-colors"
                  >
                    Próximo →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(dia => (
                    <div key={dia} className="text-center text-xs font-medium text-[#94A3B8] py-2">
                      {dia}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {diasCalendario.map((d, idx) => (
                    <button
                      key={idx}
                      onClick={() => d.data && setDiaSelecionado(d.data === diaSelecionado ? null : d.data)}
                      disabled={!d.data}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-colors ${
                        !d.data
                          ? "bg-transparent"
                          : d.data === diaSelecionado
                          ? "bg-[#0F3460] text-white"
                          : d.data === hojeStr
                          ? "bg-[#EFF6FF] text-[#0F3460] hover:bg-[#DBEAFE]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span className={`text-sm font-medium ${!d.data ? "invisible" : ""}`}>{d.dia}</span>
                      {d.consultas.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: Math.min(d.consultas.length, 3) }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                d.data === diaSelecionado ? "bg-white" : "bg-[#378ADD]"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {diaSelecionado && (
                <SecaoConsultas
                  titulo={formatarBR(diaSelecionado)}
                  itens={itensDiaSelecionado}
                  hojeStr={hojeStr}
                  amanhaStr={amanhaStr}
                  menuAberto={menuAberto}
                  onToggleMenu={(id) => setMenuAberto(p => ({ ...p, [id]: !p[id] }))}
                  onCompareceu={handleCompareceu}
                  onNaoCompareceu={handleNaoCompareceu}
                  onCancelar={handleCancelar}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>

    {modalCompareceu && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <h3 className="text-base font-bold text-[#1E293B] mb-1">
            Confirmar comparecimento
          </h3>
          <p className="text-sm text-[#64748B] mb-4">
            {modalCompareceu.item?.pacienteNome}
          </p>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
            Valor da consulta (R$){" "}
            <span className="text-[#94A3B8] font-normal">(opcional)</span>
          </label>
          <div className="relative mb-6">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">
              R$
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={modalCompareceu.valor}
              onChange={(e) =>
                setModalCompareceu((prev) =>
                  prev ? { ...prev, valor: e.target.value } : null
                )
              }
              className="w-full h-11 pl-9 pr-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalCompareceu(null)}
              className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarCompareceu}
              className="flex-1 h-10 rounded-lg bg-[#10B981] text-white text-sm font-medium hover:bg-[#059669]"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-20 text-center bg-white border border-[#E2E8F0] rounded-xl">
      <CheckCircle className="h-10 w-10 text-[#10B981] mx-auto mb-3" />
      <p className="text-[#1E293B] font-medium">Tudo em dia!</p>
      <p className="text-sm text-[#64748B] mt-1">{msg}</p>
    </div>
  )
}

function SecaoConsultas({
  titulo, itens, hojeStr, amanhaStr, menuAberto, onToggleMenu,
  onCompareceu, onNaoCompareceu, onCancelar,
}: {
  titulo: string
  itens: AgendaItem[]
  hojeStr: string
  amanhaStr: string
  menuAberto: Record<string, boolean>
  onToggleMenu: (id: string) => void
  onCompareceu: (item: AgendaItem) => void
  onNaoCompareceu: (item: AgendaItem) => void
  onCancelar: (item: AgendaItem) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-[#64748B]" />
        <h2 className="text-sm font-semibold text-[#64748B]">{titulo}</h2>
        <span className="bg-[#F1F5F9] text-[#64748B] text-xs px-2 py-0.5 rounded-full">{itens.length}</span>
      </div>
      <div className="space-y-2">
        {itens.map(item => (
          <CardConsulta
            key={item.id}
            item={item}
            hojeStr={hojeStr}
            amanhaStr={amanhaStr}
            menuAberto={!!menuAberto[item.id]}
            onToggleMenu={() => onToggleMenu(item.id)}
            onCompareceu={onCompareceu}
            onNaoCompareceu={onNaoCompareceu}
            onCancelar={onCancelar}
          />
        ))}
      </div>
    </div>
  )
}

function CardConsulta({
  item, hojeStr, amanhaStr, menuAberto, onToggleMenu,
  onCompareceu, onNaoCompareceu, onCancelar,
}: {
  item: AgendaItem
  hojeStr: string
  amanhaStr: string
  menuAberto: boolean
  onToggleMenu: () => void
  onCompareceu: (item: AgendaItem) => void
  onNaoCompareceu: (item: AgendaItem) => void
  onCancelar: (item: AgendaItem) => void
}) {
  const isAtrasado = item.dataReferencia < hojeStr
  const isHoje = item.dataReferencia === hojeStr
  const isAmanha = item.dataReferencia === amanhaStr

  const primeiroNome = item.pacienteNome.split(" ")[0]
  const dataFmt = isHoje ? "hoje" : isAmanha ? "amanhã" : formatarBR(item.dataReferencia)
  const horarioFmt = item.horario ? item.horario.slice(0, 5) : ""

  const msgWA = `Olá ${primeiroNome}, passando para confirmar sua consulta de ${dataFmt}${horarioFmt ? ` às ${horarioFmt}` : ""}. Você confirma?`
  const waLink = gerarWA(item.pacienteTelefone, msgWA)

  const initials = item.pacienteNome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

  const statusLabel = item.statusAgendamento === "confirmado" ? "Confirmado" : "Aguardando"
  const statusColor = item.statusAgendamento === "confirmado" ? "bg-[#EFF6FF] text-[#185FA5]" : "bg-[#FFFBEB] text-[#854F0B]"

  return (
    <div className={`bg-white border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#CBD5E1] transition-colors ${isAtrasado ? "border-[#FECACA]" : "border-[#E2E8F0]"}`}>
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAtrasado ? "bg-[#EF4444]" : item.statusAgendamento === "confirmado" ? "bg-[#3B82F6]" : "bg-[#378ADD]"}`} />

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-xs font-bold shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#1E293B]">{item.pacienteNome}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
          <span className="text-xs text-[#94A3B8]">
            {isHoje ? "Hoje" : isAmanha ? "Amanhã" : formatarBR(item.dataReferencia)}
            {horarioFmt ? ` · ${horarioFmt}` : ""}
          </span>
          {isAtrasado && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] font-medium">Atrasado</span>
          )}
        </div>
        <p className="text-sm text-[#64748B] mt-0.5">{item.procedimento || item.motivo}</p>
        <p className="text-xs text-[#94A3B8] mt-0.5">{item.pacienteTelefone}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366] text-white text-xs font-medium hover:bg-[#1ebe5d] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="white" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.523 5.855L.057 23.428a.75.75 0 0 0 .916.916l5.573-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.696-.534-5.218-1.457l-.374-.223-3.879 1.021 1.021-3.879-.223-.374A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            WhatsApp
          </a>
        ) : (
          <span className="text-xs text-[#EF4444] bg-[#FEF2F2] px-2 py-1 rounded-lg">Nº inválido</span>
        )}

        <button
          onClick={() => onCompareceu(item)}
          className="h-8 px-3 rounded-lg bg-[#10B981] text-white text-xs font-medium hover:bg-[#059669] transition-colors"
        >
          ✓ Compareceu
        </button>

        <div className="relative">
          <button
            onClick={onToggleMenu}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuAberto && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => onNaoCompareceu(item)}
                className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:bg-[#FEF2F2] hover:text-[#EF4444]"
              >
                ✗ Não compareceu
              </button>
              <button
                onClick={() => onCancelar(item)}
                className="w-full px-4 py-2.5 text-left text-sm text-[#1E293B] hover:bg-[#F8FAFC]"
              >
                ❌ Cancelar agendamento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}