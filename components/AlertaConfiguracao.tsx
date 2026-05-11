"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MENSAGENS_ALERTA: Record<string, { texto: string; link: string; linkTexto: string }> = {
  nome_clinica: {
    texto: "O nome da sua clínica não está configurado.",
    link: "/dashboard/configuracoes",
    linkTexto: "Configurar agora",
  },
  telefone: {
    texto: "O telefone da clínica não está cadastrado.",
    link: "/dashboard/configuracoes",
    linkTexto: "Adicionar telefone",
  },
  ticket_medio: {
    texto: "Configure o ticket médio da clínica para calcular a receita em risco corretamente.",
    link: "/dashboard/configuracoes",
    linkTexto: "Configurar ticket médio",
  },
  sem_pacientes: {
    texto: "Você ainda não importou nenhum paciente. Importe agora para começar a reativar.",
    link: "/dashboard/pacientes",
    linkTexto: "Importar pacientes",
  },
  sem_mensagens: {
    texto: "Configure as mensagens de recontato para personalizar seu atendimento.",
    link: "/dashboard/configuracoes",
    linkTexto: "Configurar mensagens",
  },
};

export default function AlertaConfiguracao() {
  const [alertas, setAlertas] = useState<string[]>([]);
  const [fechados, setFechados] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/clinica/status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.completo) {
          setAlertas(data.alertas ?? []);
        }
      });
  }, []);

  const alertasVisiveis = alertas.filter((a) => !fechados.includes(a));

  if (alertasVisiveis.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-6">
      {alertasVisiveis.map((alerta) => {
        const info = MENSAGENS_ALERTA[alerta];
        if (!info) return null;
        return (
          <div
            key={alerta}
            className="flex items-center justify-between bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 text-lg">⚠️</span>
              <span className="text-yellow-800 text-sm font-medium">{info.texto}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(info.link)}
                className="text-sm text-blue-600 font-semibold hover:underline whitespace-nowrap"
              >
                {info.linkTexto}
              </button>
              <button
                onClick={() => setFechados((prev) => [...prev, alerta])}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
