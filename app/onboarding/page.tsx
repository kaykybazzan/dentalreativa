"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, Clock, Check, FileSpreadsheet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

type OnboardingData = {
  clinicName: string
  city: string
  phone: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">("next")
  
  // Step 2 - Import option
  const [importOption, setImportOption] = useState<"later" | "now">("later")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [patientsFound, setPatientsFound] = useState<number | null>(null)
  
  // Signup data from localStorage
  const [signupData, setSignupData] = useState<OnboardingData>({
    clinicName: "Clínica Sorriso Perfeito",
    city: "São Paulo",
    phone: "(11) 99999-0000"
  })
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Check if onboarding is already done
    if (typeof window !== "undefined") {
      if (localStorage.getItem("onboarding_done") === "true") {
        router.push("/dashboard")
        return
      }
      
      // Restore step
      const savedStep = localStorage.getItem("onboarding_step")
      if (savedStep) {
        setCurrentStep(parseInt(savedStep))
      }
      
      // Get signup data
      const savedSignupData = localStorage.getItem("signup_data")
      if (savedSignupData) {
        try {
          const parsed = JSON.parse(savedSignupData)
          setSignupData(parsed)
        } catch {
          // Use defaults
        }
      }
    }
  }, [router])

  const goToStep = useCallback((step: number, direction: "next" | "prev" = "next") => {
    setAnimationDirection(direction)
    setIsAnimating(true)
    
    setTimeout(() => {
      setCurrentStep(step)
      localStorage.setItem("onboarding_step", step.toString())
      setIsAnimating(false)
    }, 250)
  }, [])

  const handleContinue = async () => {
    if (currentStep === 1) {
      setErrors({})
      try {
        await fetch('/api/clinica', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: signupData.clinicName,
            telefone: signupData.phone,
            cidade: signupData.city,
            ticketMedio: 300
          })
        })
      } catch (error) {
        console.error('Erro ao salvar clínica:', error)
      }
    }

    if (currentStep === 3) {
      // Save default messages via API
      try {
        await fetch('/api/mensagens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem1: 'Olá [nome]! Já faz um tempinho desde sua última consulta na [clinica]. Que tal agendar uma revisão?',
            mensagem2: '[nome], temos horários disponíveis essa semana na [clinica]. Posso reservar um para você?',
            mensagem3: 'Oi [nome]! Queremos ter certeza de que está tudo bem. Podemos ajudar com algo? Entre em contato com a [clinica].'
          })
        })
      } catch (error) {
        console.error('Erro ao salvar mensagens:', error)
      }
    }
    
    if (currentStep < 4) {
      goToStep(currentStep + 1, "next")
    }
  }

  const handleFinish = () => {
    localStorage.setItem("onboarding_done", "true")
    localStorage.removeItem("onboarding_step")
    router.push("/dashboard")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      // Simulate patient count
      setTimeout(() => {
        setPatientsFound(247)
      }, 500)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadedFile(file)
      setTimeout(() => {
        setPatientsFound(247)
      }, 500)
    }
  }

  const steps = [
    { number: 1, label: "Clínica" },
    { number: 2, label: "Pacientes" },
    { number: 3, label: "Mensagens" },
    { number: 4, label: "Pronto" }
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo */}
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="DentalReativa" width={32} height={32} className="object-contain" />
          <span className="text-xl font-semibold text-foreground">DentalReativa</span>
        </div>
      </div>

      {/* Centered Card */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[680px] bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] border border-border p-10 md:px-12 md:py-10">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div 
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                      currentStep > step.number 
                        ? "bg-success text-success-foreground" 
                        : currentStep === step.number 
                          ? "bg-primary text-primary-foreground"
                          : "bg-border text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className="mt-2 text-[11px] text-muted-foreground">{step.label}</span>
                </div>
                
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={`h-0.5 w-12 md:w-16 mx-2 transition-colors duration-300 ${
                      currentStep > step.number ? "bg-success" : "bg-border"
                    }`} 
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content with Animation */}
          <div 
            className={`transition-all duration-250 ease-out ${
              isAnimating 
                ? animationDirection === "next"
                  ? "opacity-0 -translate-x-4"
                  : "opacity-0 translate-x-4"
                : "opacity-100 translate-x-0"
            }`}
          >
            {/* Step 1 - Completar dados da clínica */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Dados da sua clínica</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Confirme as informações que serão usadas nas mensagens enviadas aos pacientes.
                  </p>
                </div>


                {/* Summary Card */}
                <div className="bg-background rounded-lg border border-border p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="font-medium">Nome:</span>
                    <span>{signupData.clinicName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="font-medium">Cidade:</span>
                    <span>{signupData.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="font-medium">Telefone:</span>
                    <span>{signupData.phone}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                    Você pode editar esses dados a qualquer momento em Configurações.
                  </p>
                </div>

                <Button
                  onClick={handleContinue}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  Continuar →
                </Button>
              </div>
            )}

            {/* Step 2 - Importar Pacientes */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Importe seus pacientes</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O sistema identifica automaticamente quem está em risco
                  </p>
                </div>

                {/* Option Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Import Now Card */}
                  <button
                    type="button"
                    onClick={() => setImportOption("now")}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      importOption === "now" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <Upload className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Importar planilha</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV ou Excel exportado do seu sistema odontológico
                    </p>
                  </button>

                  {/* Do Later Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setImportOption("later")
                      setUploadedFile(null)
                      setPatientsFound(null)
                    }}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      importOption === "later" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <Clock className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Fazer depois</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Importe quando tiver a planilha em mãos
                    </p>
                  </button>
                </div>

                {/* File Drop Zone */}
                {importOption === "now" && (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      uploadedFile && patientsFound 
                        ? "border-success bg-success/5" 
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    {uploadedFile && patientsFound ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-success/10">
                          <Check className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{uploadedFile.name}</span>
                          <button 
                            type="button"
                            onClick={() => {
                              setUploadedFile(null)
                              setPatientsFound(null)
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-success">{patientsFound} pacientes encontrados</p>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-foreground">
                          Arraste seu arquivo ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">.csv ou .xlsx</p>
                      </label>
                    )}
                  </div>
                )}

                <div>
                  <Button
                    onClick={handleContinue}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                  >
                    Continuar →
                  </Button>
                  {importOption === "later" && (
                    <p className="text-center text-xs text-muted-foreground mt-3">
                      Você poderá importar a qualquer momento
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 - Mensagens Prontas */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Mensagens prontas para envio</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    3 modelos já configurados. Você pode editá-los depois nas configurações.
                  </p>
                </div>

                {/* Message Cards */}
                <div className="space-y-4">
                  {/* Message 1 - 1ª tentativa */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1D4ED8]">
                        1ª tentativa
                      </span>
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none p-3">
                      <p className="text-sm text-foreground">
                        Olá [nome]! Já faz um tempinho desde sua última consulta na [clinica]. Que tal agendar uma revisão?
                      </p>
                    </div>
                  </div>

                  {/* Message 2 - 2ª tentativa */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#92400E]">
                        2ª tentativa
                      </span>
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none p-3">
                      <p className="text-sm text-foreground">
                        [nome], temos horários disponíveis essa semana na [clinica]. Posso reservar um para você?
                      </p>
                    </div>
                  </div>

                  {/* Message 3 - 3ª tentativa */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF2F2] text-[#DC2626]">
                        3ª tentativa
                      </span>
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none p-3">
                      <p className="text-sm text-foreground">
                        Oi [nome]! Queremos ter certeza de que está tudo bem. Podemos ajudar com algo? Entre em contato com a [clinica].
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#64748B] text-center mt-2">
                  Você poderá editar estas mensagens depois em 
                  <span className="font-medium text-[#1E293B]"> Configurações → Mensagens</span>.
                </p>

                <Button
                  onClick={handleContinue}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  Continuar →
                </Button>
              </div>
            )}

            {/* Step 4 - Tudo Pronto */}
            {currentStep === 4 && (
              <div className="space-y-6 text-center">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success">
                    <Check className="h-7 w-7 text-success-foreground" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-foreground">Tudo pronto!</h2>
                  <p className="mt-2 text-muted-foreground">
                    Seu sistema está configurado e pronto para recuperar pacientes.
                  </p>
                </div>

                {/* Achievement Rows */}
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Ver pacientes em risco
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Enviar mensagens pelo WhatsApp
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Acompanhar receita recuperada no mês
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Stats Card */}
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 text-center">
                  <p className="text-sm text-[#166534] font-medium mb-2">
                    Seu potencial de recuperação
                  </p>
                  <p className="text-sm text-[#166534] leading-relaxed">
                    Clínicas recuperam entre{" "}
                    <span className="font-bold">R$ 3.000</span> e{" "}
                    <span className="font-bold">R$ 15.000</span>{" "}
                    por mês reativando pacientes inativos
                  </p>
                  <p className="text-xs text-[#166534]/70 mt-2">
                    Estimativa baseada em cenários reais. Seu resultado aparecerá 
                    após os primeiros pacientes recuperados.
                  </p>
                </div>

                <Button
                  onClick={handleFinish}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  Ir para o painel →
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

