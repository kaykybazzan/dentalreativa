"use client"

import { useEffect, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

interface DateRangePickerProps {
  onApply: (from: string, to: string) => void
  onCancel: () => void
}

export function DateRangePicker({ onApply, onCancel }: DateRangePickerProps) {
  const [fromInput, setFromInput] = useState("")
  const [toInput, setToInput] = useState("")
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(null)
  const [selectedTo, setSelectedTo] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMode, setCalendarMode] = useState<"from" | "to">("from")

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Parse DD/MM/YYYY to Date
  const parseDate = (dateStr: string) => {
    const parts = dateStr.replace(/\D/g, "").split("")
    if (parts.length < 8) return null
    const day = parseInt(parts.slice(0, 2).join(""))
    const month = parseInt(parts.slice(2, 4).join(""))
    const year = parseInt(parts.slice(4, 8).join(""))
    
    const date = new Date(year, month - 1, day)
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null
    return date
  }

  // Apply mask to input
  const applyMask = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    let masked = ""
    
    if (numbers.length > 0) {
      masked = numbers.slice(0, 2)
    }
    if (numbers.length > 2) {
      masked += "/" + numbers.slice(2, 4)
    }
    if (numbers.length > 4) {
      masked += "/" + numbers.slice(4, 8)
    }
    
    return masked.slice(0, 10)
  }

  const handleFromInput = (value: string) => {
    const masked = applyMask(value)
    setFromInput(masked)
    if (masked.length === 10) {
      const date = parseDate(masked)
      if (date) setSelectedFrom(date)
    }
  }

  const handleToInput = (value: string) => {
    const masked = applyMask(value)
    setToInput(masked)
    if (masked.length === 10) {
      const date = parseDate(masked)
      if (date) setSelectedTo(date)
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isDateInRange = (date: Date) => {
    if (!selectedFrom || !selectedTo) return false
    const from = new Date(selectedFrom)
    const to = new Date(selectedTo)
    const current = new Date(date)
    from.setHours(0, 0, 0, 0)
    to.setHours(0, 0, 0, 0)
    current.setHours(0, 0, 0, 0)
    return current > from && current < to
  }

  const isDateSelected = (date: Date) => {
    const current = new Date(date)
    current.setHours(0, 0, 0, 0)
    
    if (selectedFrom) {
      const from = new Date(selectedFrom)
      from.setHours(0, 0, 0, 0)
      if (current.getTime() === from.getTime()) return true
    }
    
    if (selectedTo) {
      const to = new Date(selectedTo)
      to.setHours(0, 0, 0, 0)
      if (current.getTime() === to.getTime()) return true
    }
    
    return false
  }

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    
    if (calendarMode === "from") {
      setSelectedFrom(date)
      setFromInput(formatDate(date))
      setCalendarMode("to")
    } else {
      if (selectedFrom && date < selectedFrom) {
        setSelectedFrom(date)
        setSelectedTo(null)
        setFromInput(formatDate(date))
        setToInput("")
        setCalendarMode("to")
      } else {
        setSelectedTo(date)
        setToInput(formatDate(date))
        setShowCalendar(false)
      }
    }
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (calendarMode === "from") {
      setSelectedFrom(today)
      setFromInput(formatDate(today))
      setCalendarMode("to")
    } else {
      setSelectedTo(today)
      setToInput(formatDate(today))
      setShowCalendar(false)
    }
  }

  const handleClear = () => {
    setFromInput("")
    setToInput("")
    setSelectedFrom(null)
    setSelectedTo(null)
    setCalendarMode("from")
  }

  const handleApply = () => {
    if (selectedFrom && selectedTo) {
      const fromFormatted = formatDate(selectedFrom)
      const toFormatted = formatDate(selectedTo)
      onApply(fromFormatted, toFormatted)
    }
  }

  const days = []
  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-[#E2E8F0]" style={{ minWidth: "380px" }}>
      <p className="text-sm font-bold text-[#1E293B] mb-4">Selecionar período</p>

      {/* Input Fields */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-[#64748B] mb-1.5 font-medium">De</label>
          <div className="relative">
            <input
              type="text"
              value={fromInput}
              onChange={(e) => handleFromInput(e.target.value)}
              onClick={() => {
                setShowCalendar(true)
                setCalendarMode("from")
              }}
              placeholder="DD/MM/AAAA"
              className="w-full h-10 px-3 pr-10 text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F3460] focus:ring-1 focus:ring-[#0F3460]"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-[#64748B] mb-1.5 font-medium">Até</label>
          <div className="relative">
            <input
              type="text"
              value={toInput}
              onChange={(e) => handleToInput(e.target.value)}
              onClick={() => {
                setShowCalendar(true)
                setCalendarMode("to")
              }}
              placeholder="DD/MM/AAAA"
              className="w-full h-10 px-3 pr-10 text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F3460] focus:ring-1 focus:ring-[#0F3460]"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Calendar */}
      {showCalendar && (
        <div className="mb-4 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-[#64748B]" />
            </button>
            <h3 className="text-sm font-semibold text-[#1E293B]">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-[#64748B]" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-[#64748B]">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => day && handleDayClick(day)}
                disabled={!day}
                className={`h-8 rounded transition-colors text-sm font-medium ${
                  !day
                    ? "bg-transparent"
                    : isDateSelected(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
                    ? "bg-[#0F3460] text-white rounded-full"
                    : isDateInRange(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
                    ? "bg-[#EFF6FF] text-[#0F3460]"
                    : "bg-white text-[#1E293B] hover:bg-[#F1F5F9]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Calendar Footer */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={handleClear}
              className="flex-1 h-9 text-xs font-medium text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleToday}
              className="flex-1 h-9 text-xs font-medium text-[#0F3460] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 h-9 text-sm font-medium text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleApply}
          disabled={!selectedFrom || !selectedTo}
          className="flex-1 h-9 text-sm font-medium text-white bg-[#0F3460] rounded-lg hover:bg-[#0F3460]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
