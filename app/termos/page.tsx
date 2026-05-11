import Image from "next/image"
import Link from "next/link"

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#E2E8F0]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="DentalReativa" width={40} height={40} className="object-contain" />
            <span className="text-lg font-semibold text-[#1E293B]">DentalReativa</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-[#1E293B] mb-2">TERMOS DE USO — DentalReativa</h1>
        <p className="text-sm text-[#64748B] mb-10">Última atualização: abril de 2025</p>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">1. Aceitação dos Termos</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Ao criar uma conta e utilizar o DentalReativa, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o sistema.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">2. O que é o DentalReativa</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa é um sistema SaaS (Software as a Service) desenvolvido para clínicas odontológicas brasileiras. O sistema permite identificar pacientes em risco de abandono, preparar mensagens de reativação personalizadas e organizar uma fila diária de contatos via WhatsApp Web (wa.me).
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa não realiza envios automáticos de mensagens. O envio é sempre manual, realizado pela recepcionista da clínica com um clique, que abre o WhatsApp Web com a mensagem já preparada.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">3. Cadastro e Responsabilidades da Clínica</h2>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>3.1. Para utilizar o DentalReativa, a clínica deve criar uma conta com dados verdadeiros e atualizados.</li>
            <li>3.2. A clínica é responsável por manter suas credenciais de acesso em sigilo e por todas as ações realizadas em sua conta.</li>
            <li>3.3. A clínica é responsável por obter o consentimento adequado de seus pacientes para o recebimento de mensagens via WhatsApp, conforme a legislação brasileira vigente.</li>
            <li>3.4. A clínica é responsável pela veracidade e atualização dos dados de pacientes inseridos no sistema.</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">4. Plano Fundador</h2>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>4.1. O DentalReativa é um serviço pago. O Plano Fundador tem valor de R$ 97,00 por mês.</li>
            <li>4.2. O pagamento é realizado mensalmente. Em caso de inadimplência, o acesso ao sistema poderá ser suspenso após 5 dias de atraso.</li>
            <li>4.3. O cancelamento pode ser solicitado a qualquer momento pelo email de suporte. O acesso permanece ativo até o final do período já pago.</li>
            <li>4.4. Não há reembolso proporcional por períodos não utilizados.</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">5. Uso Permitido</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            É permitido utilizar o DentalReativa exclusivamente para gerenciar a reativação de pacientes da clínica cadastrada. É proibido:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>Utilizar o sistema para enviar mensagens em massa não relacionadas ao atendimento odontológico</li>
            <li>Compartilhar credenciais de acesso com terceiros fora da equipe da clínica</li>
            <li>Tentar acessar dados de outras clínicas</li>
            <li>Utilizar o sistema para finalidades ilegais ou que violem direitos de pacientes</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">6. Disponibilidade do Sistema</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa se esforça para manter o sistema disponível 24 horas por dia, 7 dias por semana. No entanto, podem ocorrer interrupções para manutenção, atualizações ou por fatores externos fora do nosso controle. Nos comprometemos a comunicar interrupções programadas com antecedência mínima de 24 horas.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">7. Limitação de Responsabilidade</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa não se responsabiliza por:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>Resultados financeiros decorrentes do uso ou não uso do sistema</li>
            <li>Mensagens enviadas pela clínica aos seus pacientes e suas consequências</li>
            <li>Perda de dados causada por falha da clínica em manter seus dados atualizados</li>
            <li>Indisponibilidade do WhatsApp Web ou mudanças nas políticas do WhatsApp/Meta</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">8. Propriedade Intelectual</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Todo o conteúdo do DentalReativa — incluindo código, design, textos e funcionalidades — é de propriedade exclusiva do DentalReativa. É proibida a reprodução, cópia ou distribuição sem autorização expressa.
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Os dados inseridos pela clínica (pacientes, configurações, mensagens) pertencem à clínica.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">9. Alterações nos Termos</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa pode atualizar estes Termos a qualquer momento. Alterações significativas serão comunicadas por email com antecedência mínima de 15 dias. O uso continuado do sistema após esse prazo implica aceitação dos novos termos.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">10. Contato e Suporte</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Para dúvidas, suporte ou solicitações relacionadas a estes Termos, entre em contato pelo email: contato@dentalreativa.com.br
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-8">
        <p className="text-xs text-[#94A3B8]">© 2025 DentalReativa. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
