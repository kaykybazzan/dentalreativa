"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Mail, Lock, Eye, EyeOff, Check, DollarSign, CheckCircle, Users } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { SignupModal } from "@/components/signup-modal"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const handleSignupSuccess = () => {
    setIsSignupModalOpen(false)
    setShowSuccessToast(true)
  }

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false)
        router.push("/dashboard")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessToast, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: { email?: string; password?: string; general?: string } = {}
    
    if (!email.trim()) {
      newErrors.email = "Este campo é obrigatório"
    }
    if (!password.trim()) {
      newErrors.password = "Este campo é obrigatório"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    setIsLoading(true)
    
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })
    
    setIsLoading(false)
    
    if (result?.ok) {
      window.location.href = '/dashboard'
    } else {
      setErrors({ general: "Email ou senha incorretos" })
    }
  }

  return (
    <>
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Conta criada com sucesso!</span>
        </div>
      )}

      {/* Signup Modal */}
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onSuccess={handleSignupSuccess}
      />

      <div className="flex min-h-screen bg-background">
        {/* Left Side - Login Form */}
        <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[55%] lg:px-16 xl:w-1/2 xl:px-24">
          <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-12 flex items-center gap-2">
            <Image src="/logo.png" alt="DentalReativa" width={32} height={32} className="object-contain" />
            <span className="text-xl font-semibold text-foreground">DentalReativa</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse sua conta para ver seus pacientes em risco hoje
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                  }}
                  className={`pl-10 ${errors.email ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <p className="text-sm text-center text-destructive">{errors.general}</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                "Entrar"
              )}
            </Button>

          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <button
              type="button"
              onClick={() => setIsSignupModalOpen(true)}
              className="text-primary hover:underline font-medium"
            >
              Criar conta
            </button>
          </p>
          </div>
        </div>

        {/* Right Side - Value Panel */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-[#0F3460] p-12 xl:p-16 flex-col justify-center relative overflow-hidden">
          <div className="max-w-lg">
          {/* Flat Modern Illustration */}
          <div className="mb-10">
            <DentalIllustration className="w-full max-w-[280px]" />
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight text-balance">
            Seus pacientes estão sumindo. Você sabe quais?
          </h2>
          <p className="mt-4 text-white/70 text-lg leading-relaxed">
            O DentalReativa identifica automaticamente quem está em risco e te ajuda a trazer de volta com uma mensagem.
          </p>

          {/* Benefits List */}
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                <Check className="h-4 w-4 text-success-foreground" />
              </div>
              <span className="text-white">Veja quem está sumindo em segundos</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                <Check className="h-4 w-4 text-success-foreground" />
              </div>
              <span className="text-white">Envie mensagens prontas pelo WhatsApp</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                <Check className="h-4 w-4 text-success-foreground" />
              </div>
              <span className="text-white">Acompanhe a receita recuperada no mês</span>
            </li>
          </ul>
        </div>

        {/* Floating Card */}
        <div className="absolute bottom-12 right-8 xl:bottom-16 xl:right-12 bg-card rounded-2xl px-4 py-3 shadow-lg w-[200px]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 shrink-0">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-base font-bold text-card-foreground leading-tight">R$ 12.400</p>
              <p className="text-[11px] text-muted-foreground leading-tight">recuperados esse mês</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">34 pacientes reativados</p>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

function DentalIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="140" cy="90" r="70" fill="rgba(255,255,255,0.08)" />
      
      {/* Tooth icon - main */}
      <path 
        d="M140 45C130 45 122 52 118 62C114 52 106 45 96 45C86 45 78 53 78 65C78 77 82 87 82 97C82 117 92 135 106 135C116 135 118 120 140 120C162 120 164 135 174 135C188 135 198 117 198 97C198 87 202 77 202 65C202 53 194 45 184 45C174 45 166 52 162 62C158 52 150 45 140 45Z" 
        fill="white"
        opacity="0.95"
      />
      
      {/* Sparkle 1 */}
      <circle cx="70" cy="50" r="4" fill="rgba(147,197,253,0.8)" />
      <circle cx="70" cy="50" r="2" fill="white" />
      
      {/* Sparkle 2 */}
      <circle cx="210" cy="65" r="3" fill="rgba(147,197,253,0.8)" />
      <circle cx="210" cy="65" r="1.5" fill="white" />
      
      {/* Sparkle 3 */}
      <circle cx="95" cy="145" r="3.5" fill="rgba(147,197,253,0.6)" />
      <circle cx="95" cy="145" r="1.5" fill="white" />
      
      {/* Plus icons representing healthcare */}
      <g opacity="0.6">
        <rect x="55" y="100" width="16" height="4" rx="2" fill="rgba(147,197,253,0.9)" />
        <rect x="61" y="94" width="4" height="16" rx="2" fill="rgba(147,197,253,0.9)" />
      </g>
      
      <g opacity="0.5">
        <rect x="205" y="115" width="12" height="3" rx="1.5" fill="rgba(147,197,253,0.8)" />
        <rect x="209.5" y="110.5" width="3" height="12" rx="1.5" fill="rgba(147,197,253,0.8)" />
      </g>
      
      {/* Small tooth icons */}
      <path 
        d="M45 80C42 80 40 82 39 85C38 82 36 80 33 80C30 80 28 82 28 86C28 90 29 93 29 96C29 102 32 107 36 107C39 107 40 102 45 102C50 102 51 107 54 107C58 107 61 102 61 96C61 93 62 90 62 86C62 82 60 80 57 80C54 80 52 82 51 85C50 82 48 80 45 80Z" 
        fill="rgba(147,197,253,0.5)"
      />
      
      <path 
        d="M235 95C232 95 230 97 229 100C228 97 226 95 223 95C220 95 218 97 218 101C218 105 219 108 219 111C219 117 222 122 226 122C229 122 230 117 235 117C240 117 241 122 244 122C248 122 251 117 251 111C251 108 252 105 252 101C252 97 250 95 247 95C244 95 242 97 241 100C240 97 238 95 235 95Z" 
        fill="rgba(147,197,253,0.4)"
      />
      
      {/* Checkmark in circle */}
      <circle cx="185" cy="145" r="14" fill="rgba(34,197,94,0.9)" />
      <path d="M179 145L183 149L191 141" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
