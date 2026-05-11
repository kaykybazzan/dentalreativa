"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { X, Check, User, Mail, Lock, Building2, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type PasswordStrength = "weak" | "medium" | "strong"

export function SignupModal({ isOpen, onClose, onSuccess }: SignupModalProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Step 1 fields
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Step 2 fields
  const [clinicName, setClinicName] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const getPasswordStrength = (pwd: string): PasswordStrength => {
    if (pwd.length < 6) return "weak"
    const hasLower = /[a-z]/.test(pwd)
    const hasUpper = /[A-Z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd)
    const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
    if (pwd.length >= 8 && score >= 3) return "strong"
    if (pwd.length >= 6 && score >= 2) return "medium"
    return "weak"
  }

  const passwordStrength = getPasswordStrength(password)

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }))
  }

  const validateStep1 = () => {
    console.log("[v0] Validando step 1:", { fullName, email, password, confirmPassword })
    const newErrors: Record<string, string> = {}
    
    if (!fullName.trim()) newErrors.fullName = "Este campo é obrigatório"
    if (!email.trim()) newErrors.email = "Este campo é obrigatório"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email inválido"
    if (!password) newErrors.password = "Este campo é obrigatório"
    else if (password.length < 6) newErrors.password = "Mínimo de 6 caracteres"
    if (!confirmPassword) newErrors.confirmPassword = "Este campo é obrigatório"
    else if (password !== confirmPassword) newErrors.confirmPassword = "As senhas não coincidem"
    
    setErrors(newErrors)
    console.log("[v0] Erros após validação step 1:", newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    console.log("[v0] Validando step 2:", { clinicName, city, acceptedTerms })
    const newErrors: Record<string, string> = {}
    
    if (!clinicName.trim()) {
      newErrors.clinicName = "Este campo é obrigatório"
      console.log("[v0] Erro: clinicName vazio")
    }
    if (!city.trim()) {
      newErrors.city = "Este campo é obrigatório"
      console.log("[v0] Erro: city vazio")
    }
    if (!acceptedTerms) {
      newErrors.terms = "Você precisa aceitar os termos"
      console.log("[v0] Erro: termos não aceitos")
    }
    
    setErrors(newErrors)
    console.log("[v0] Erros após validação:", newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    console.log("[v0] handleContinue chamado, step atual:", step)
    if (validateStep1()) {
      console.log("[v0] Validação step 1 passou, movendo para step 2")
      setStep(2)
      setErrors({})
    } else {
      console.log("[v0] Validação step 1 falhou")
    }
  }

  const handleBack = () => {
    setStep(1)
    setErrors({})
  }

  const handleSubmit = async () => {
    console.log("[v0] Iniciando handleSubmit")
    if (!validateStep2()) {
      console.log("[v0] Validação falhou:", errors)
      return
    }
    
    console.log("[v0] Validação passou, iniciando criação de conta")
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: fullName,
          email,
          senha: password,
          nomeDaClinica: clinicName,
          cidade: city,
          telefone: phone || "(11) 99999-0000"
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setErrors({ general: data.error || 'Erro ao criar conta' })
        setIsLoading(false)
        return
      }
      
      // Auto login
      const result = await signIn('credentials', {
        email,
        password: password,
        redirect: false
      })
      
      setIsLoading(false)
      
      if (result?.ok) {
        // Clear any previous onboarding state to ensure fresh start
        localStorage.removeItem("onboarding_done")
        localStorage.removeItem("onboarding_step")
        window.location.href = '/onboarding'
      } else {
        setErrors({ general: 'Erro ao fazer login automático' })
      }
    } catch (error) {
      console.error("[v0] Erro ao criar conta:", error)
      setErrors({ general: 'Erro ao criar conta. Tente novamente.' })
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form state
    setStep(1)
    setFullName("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setClinicName("")
    setCity("")
    setPhone("")
    setAcceptedTerms(false)
    setErrors({})
    onClose()
  }

  const handleLoginClick = () => {
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-2xl shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-8">
          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground text-center">
            Criar sua conta
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            Leva menos de 2 minutos
          </p>

          {/* Progress Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step === 1 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-success text-success-foreground"
              }`}>
                {step === 1 ? "1" : <Check className="h-4 w-4" />}
              </div>
              <div className={`h-0.5 w-12 ${step === 2 ? "bg-success" : "bg-muted"}`} />
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step === 2 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                2
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Passo {step} de 2
          </p>

          {/* Step 1 Form */}
          {step === 1 && (
            <div className="mt-6 space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: "" }))
                    }}
                    className={`pl-10 ${errors.fullName ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="signupEmail" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors(prev => ({ ...prev, email: "" }))
                    }}
                    className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="signupPassword" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signupPassword"
                    type="password"
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors(prev => ({ ...prev, password: "" }))
                    }}
                    className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                </div>
                {/* Password Strength Indicator */}
                {password && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      <div className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "weak" ? "bg-destructive" : 
                        passwordStrength === "medium" ? "bg-yellow-500" : "bg-success"
                      }`} />
                      <div className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "medium" ? "bg-yellow-500" : 
                        passwordStrength === "strong" ? "bg-success" : "bg-muted"
                      }`} />
                      <div className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "strong" ? "bg-success" : "bg-muted"
                      }`} />
                    </div>
                    <span className={`text-xs ${
                      passwordStrength === "weak" ? "text-destructive" : 
                      passwordStrength === "medium" ? "text-yellow-600" : "text-success"
                    }`}>
                      {passwordStrength === "weak" ? "Fraca" : 
                       passwordStrength === "medium" ? "Média" : "Forte"}
                    </span>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: "" }))
                    }}
                    className={`pl-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Continue Button */}
              <Button
                type="button"
                onClick={handleContinue}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg mt-2"
              >
                Continuar
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="text-primary hover:underline font-medium"
                >
                  Fazer login
                </button>
              </p>
            </div>
          )}

          {/* Step 2 Form */}
          {step === 2 && (
            <div className="mt-6 space-y-4">
              {/* Clinic Name */}
              <div className="space-y-2">
                <Label htmlFor="clinicName" className="text-sm font-medium">
                  Nome da clínica
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="clinicName"
                    type="text"
                    placeholder="Nome da sua clínica"
                    value={clinicName}
                    onChange={(e) => {
                      setClinicName(e.target.value)
                      if (errors.clinicName) setErrors(prev => ({ ...prev, clinicName: "" }))
                    }}
                    className={`pl-10 ${errors.clinicName ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.clinicName && (
                  <p className="text-sm text-destructive">{errors.clinicName}</p>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  Cidade
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="city"
                    type="text"
                    placeholder="Sua cidade"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value)
                      if (errors.city) setErrors(prev => ({ ...prev, city: "" }))
                    }}
                    className={`pl-10 ${errors.city ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked === true)
                    if (errors.terms) setErrors(prev => ({ ...prev, terms: "" }))
                  }}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  Concordo com os{" "}
                  <a href="/termos" target="_blank" className="text-primary hover:underline">Termos de uso</a>
                  {" "}e{" "}
                  <a href="/privacidade" target="_blank" className="text-[#2563eb] hover:underline">Política de privacidade</a>
                </Label>
              </div>
              {errors.terms && (
                <p className="text-sm text-destructive">{errors.terms}</p>
              )}

              {/* General Error */}
              {errors.general && (
                <p className="text-sm text-destructive text-center">{errors.general}</p>
              )}

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  "Criar minha conta"
                )}
              </Button>

              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar ao passo anterior
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
