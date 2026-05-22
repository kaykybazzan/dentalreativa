"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  X,
} from "lucide-react"
import Image from "next/image"

type SidebarProps = {
  activeNav: string
  onNavChange: (id: string) => void
  onLogout: () => void
}

export function Sidebar({ activeNav, onNavChange, onLogout }: SidebarProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [clinica, setClinica] = useState<{ nome: string; cidade?: string } | null>(null)

  const userName = session?.user?.name || "Usuário"
  const clinicName = clinica?.nome || "Carregando..."
  const clinicCity = clinica?.cidade || ""
  const userInitial = userName[0]?.toUpperCase() || "U"

  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/clinica")
        .then((res) => res.json())
        .then((data) => setClinica(data))
        .catch(() => {})
    }
  }, [session])

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

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Pacientes", icon: Users },
    { id: "automation", label: "Central de Envios", icon: Zap },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
    { id: "settings", label: "Configurações", icon: Settings },
  ]

  const handleNavClick = (id: string) => {
    onNavChange(id)
    if (id === "patients") router.push("/dashboard/pacientes")
    else if (id === "automation") router.push("/dashboard/automacao")
    else if (id === "reports") router.push("/dashboard/relatorios")
    else if (id === "settings") router.push("/dashboard/configuracoes")
    else router.push("/dashboard")
  }


  return (
    <>
      <aside className="w-60 bg-[#0F3460] flex flex-col overflow-visible z-40 relative">

        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="DentalReativa" width={40} height={40} className="object-contain brightness-0 invert" />
            <span className="text-lg font-semibold text-white">DentalReativa</span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
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

        {/* Rodapé */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between px-3 py-2.5 mb-1">
            <div className="text-left">
              <p className="text-sm font-medium text-white">{clinicName}</p>
              <p className="text-xs text-white/60">{clinicCity}</p>
            </div>
          </div>

          <div className="relative">
            <button
              id="user-menu-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-sm font-medium shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-white/60">Administrador</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div
                id="user-menu-dropdown"
                className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#1E293B]">{userName}</p>
                  <p className="text-xs text-[#64748B]">{clinicName}</p>
                </div>

                <button
                  onClick={() => { setShowUserMenu(false); setShowProfileModal(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <svg className="h-4 w-4 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Meu perfil
                </button>

                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/configuracoes") }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <svg className="h-4 w-4 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Configurações da clínica
                </button>

                <div className="border-t border-[#E2E8F0]" />

                <button
                  onClick={() => { setShowUserMenu(false); onLogout() }}
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
              <button onClick={() => setShowProfileModal(false)}>
                <X className="h-5 w-5 text-[#64748B]" />
              </button>
            </div>
            <div className="flex flex-col items-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F3460] text-white text-2xl font-bold mb-3">
                {userInitial}
              </div>
              <p className="text-base font-semibold text-[#1E293B]">{userName}</p>
              <p className="text-sm text-[#64748B]">Administrador</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Nome completo</label>
                <input type="text" value={userName} readOnly className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] bg-[#F8FAFC]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Clínica</label>
                <input type="text" value={clinicName} readOnly className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] bg-[#F8FAFC]" />
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
    </>
  )
}