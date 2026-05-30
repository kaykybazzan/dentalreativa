"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface ModalVaiMarcarProps {
  aberto: boolean
  paciente: { id: string | number; nome: string; procedimento?: string } | null
  onFechar: () => void
  onConfirmar: (dados: {
    pacienteId: string | number
    dataConsulta?: string
    horario?: string
    procedimento?: string
  }) => Promise<void>
}

export function ModalVaiMarcar({ aberto, paciente, onFechar, onConfirmar }: ModalVaiMarcarProps) {
  const [temData, setTemData] = useState<"sim" | "nao" | null>(null)
  const [data, setData] = useState("")
  const [horario, setHorario] = useState("")
  const [procedimento, setProcedimento] = useState("")
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)

  const hoje = new Date().toISOString().split("T")[0]

  // Limpar estado interno ao abrir/fechar
  useEffect(() => {
    if (aberto && paciente) {
      setTemData(null)
      setData("")
      setHorario("")
      setProcedimento(paciente.procedimento || "")
      setErro("")
      setSalvando(false)
    }
  }, [aberto, paciente])

  const handleConfirmar = async () => {
    if (!paciente) return

    if (temData === null) {
      setErro("Selecione uma opção.")
      return
    }

    if (temData === "sim") {
      if (!data) {
        setErro("Informe a data da consulta.")
        return
      }
      if (data < hoje) {
        setErro("A data não pode ser no passado.")
        return
      }
    }

    setSalvando(true)
    try {
      await onConfirmar({
        pacienteId: paciente.id,
        dataConsulta: temData === "sim" ? data : undefined,
        horario: temData === "sim" ? (horario || undefined) : undefined,
        procedimento: temData === "sim" ? (procedimento || undefined) : undefined,
      })
    } catch (error) {
      console.error("Erro ao registrar:", error)
      setErro("Erro ao registrar. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto || !paciente) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">📅 Registrar agendamento</h3>
            <p className="text-sm text-[#64748B] mt-0.5">Paciente: <span className="font-medium text-[#1E293B]">{paciente.nome}</span></p>
          </div>
          <button onClick={onFechar} className="text-[#64748B] hover:text-[#1E293B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm font-medium text-[#1E293B]">A data da consulta já foi definida?</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setTemData("sim"); setErro("") }}
              className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${temData === "sim" ? "bg-[#0F3460] text-white border-[#0F3460]" : "border-[#E2E8F0] text-[#64748B] hover:border-[#0F3460]"}`}
            >
              ✅ Sim, tenho a data
            </button>
            <button
              onClick={() => { setTemData("nao"); setErro("") }}
              className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${temData === "nao" ? "bg-[#0F3460] text-white border-[#0F3460]" : "border-[#E2E8F0] text-[#64748B] hover:border-[#0F3460]"}`}
            >
              ❓ Não sei ainda
            </button>
          </div>

          {temData === "sim" && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Data da consulta *</label>
                <input type="date" value={data} min={hoje}
                  onChange={(e) => { setData(e.target.value); setErro("") }}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Horário <span className="text-[#94A3B8] font-normal">(opcional)</span></label>
                <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1E293B] mb-1.5 block">Procedimento <span className="text-[#94A3B8] font-normal">(opcional)</span></label>
                <input type="text" value={procedimento} onChange={(e) => setProcedimento(e.target.value)}
                  placeholder="Ex: Limpeza, Consulta..."
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent" />
              </div>
            </div>
          )}

          {temData === "nao" && (
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <p className="text-sm text-[#64748B]">O paciente demonstrou interesse. Será exibido novamente na fila em <strong>7 dias</strong> para confirmar a data.</p>
            </div>
          )}

          {erro && (
            <p className="text-sm text-[#EF4444]">{erro}</p>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onFechar}
            className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={temData === null || salvando}
            className="flex-1 h-10 rounded-lg bg-[#0F3460] text-white text-sm font-medium hover:bg-[#0A2540] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {salvando ? "Registrando..." : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  )
}
