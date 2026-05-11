import Image from "next/image"
import Link from "next/link"

export default function PrivacidadePage() {
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
        <h1 className="text-2xl font-bold text-[#1E293B] mb-2">POLÍTICA DE PRIVACIDADE — DentalReativa</h1>
        <p className="text-sm text-[#64748B] mb-10">Última atualização: abril de 2025</p>
        <p className="text-sm text-[#64748B] leading-relaxed mb-3">
          Esta Política de Privacidade está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">1. Quem somos</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa é o controlador dos dados pessoais tratados nesta plataforma. Somos um sistema SaaS voltado para clínicas odontológicas brasileiras, com foco na reativação de pacientes inativos via WhatsApp.
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Contato do responsável pelo tratamento de dados: contato@dentalreativa.com.br
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">2. Quais dados coletamos</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3 font-medium">2.1. Dados da clínica e do usuário:</p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2 mb-4">
            <li>Nome completo do responsável</li>
            <li>Email e senha (senha armazenada com criptografia)</li>
            <li>Nome da clínica, cidade e telefone</li>
            <li>Número de dentistas</li>
          </ul>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3 font-medium">2.2. Dados dos pacientes da clínica:</p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2 mb-4">
            <li>Nome e telefone (obrigatórios)</li>
            <li>Email (opcional)</li>
            <li>Data da última consulta</li>
            <li>Procedimento realizado</li>
            <li>Valor da consulta</li>
          </ul>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Esses dados são inseridos pela própria clínica. O DentalReativa atua como operador desses dados, sendo a clínica a controladora perante seus pacientes.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">3. Como utilizamos os dados</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Os dados são utilizados exclusivamente para:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2 mb-4">
            <li>Identificar pacientes em risco de abandono</li>
            <li>Gerar mensagens personalizadas de reativação</li>
            <li>Organizar a fila diária de contatos</li>
            <li>Calcular métricas de receita recuperada</li>
            <li>Enviar lembretes semanais de atualização da base</li>
          </ul>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Não utilizamos os dados para publicidade, venda a terceiros ou qualquer finalidade além do funcionamento do sistema.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">4. Base legal para tratamento dos dados (LGPD)</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O tratamento dos dados é realizado com base nos seguintes fundamentos legais previstos na LGPD:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>Art. 7º, V — execução de contrato do qual o titular é parte (prestação do serviço contratado)</li>
            <li>Art. 7º, IX — legítimo interesse do controlador para melhoria do serviço</li>
            <li>Art. 11, I — consentimento específico do titular para dados de saúde, quando aplicável</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">5. Dados sensíveis de saúde</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Procedimentos odontológicos podem ser considerados dados sensíveis de saúde conforme o Art. 11 da LGPD. A clínica, ao inserir esses dados no DentalReativa, declara ter obtido o consentimento adequado de seus pacientes para esse tratamento, conforme suas obrigações legais como controladora desses dados.
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa adota medidas técnicas para proteger esses dados com o mesmo nível de segurança aplicado a todos os dados pessoais da plataforma.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">6. Compartilhamento de dados</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa não vende, aluga ou compartilha dados com terceiros, exceto nas seguintes situações:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>Prestadores de serviço essenciais: servidores de hospedagem e infraestrutura, que atuam como suboperadores sob contrato de confidencialidade</li>
            <li>Obrigação legal: quando exigido por autoridade competente ou ordem judicial</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">7. Segurança dos dados</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Adotamos as seguintes medidas de segurança:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2">
            <li>Senhas armazenadas com criptografia (hash)</li>
            <li>Comunicação via HTTPS/SSL</li>
            <li>Acesso aos dados restrito à equipe autorizada</li>
            <li>Backups regulares dos dados</li>
          </ul>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">8. Retenção e exclusão dos dados</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Os dados são mantidos enquanto a conta estiver ativa. Após o cancelamento da conta:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2 mb-4">
            <li>Os dados são mantidos por até 90 dias para possível reativação</li>
            <li>Após esse prazo, os dados são excluídos permanentemente dos nossos servidores</li>
          </ul>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            A clínica pode solicitar a exclusão antecipada pelo email de contato.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">9. Direitos do titular</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Conforme a LGPD, os titulares dos dados têm direito a:
          </p>
          <ul className="text-sm text-[#64748B] leading-relaxed list-disc list-inside space-y-2 mb-4">
            <li>Confirmar a existência de tratamento de seus dados</li>
            <li>Acessar seus dados</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Solicitar anonimização, bloqueio ou exclusão de dados desnecessários</li>
            <li>Revogar o consentimento a qualquer momento</li>
            <li>Solicitar portabilidade dos dados</li>
          </ul>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Para exercer esses direitos, entre em contato pelo email: contato@dentalreativa.com.br. Responderemos em até 15 dias úteis.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">10. Cookies</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            O DentalReativa utiliza cookies essenciais para manter a sessão do usuário ativa. Não utilizamos cookies de rastreamento ou publicidade.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">11. Alterações nesta Política</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Esta Política pode ser atualizada para refletir mudanças legais ou no serviço. Alterações significativas serão comunicadas por email com antecedência de 15 dias.
          </p>
        </section>

        <div className="border-t border-[#E2E8F0] mt-10 mb-6"></div>

        <section>
          <h2 className="text-lg font-bold text-[#1E293B] mt-8 mb-3">12. Contato</h2>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados:
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed mb-3">
            Email: contato@dentalreativa.com.br
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
