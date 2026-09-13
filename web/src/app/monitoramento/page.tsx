import type { Metadata } from "next";

import { MonitoramentoInterativo } from "@/components/monitoramento-interativo";
import { carregarLeiturasDashboard } from "@/lib/api";
import type { LeituraVegetacao } from "@/types/leitura";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Monitoramento" };

export default async function PaginaMonitoramento() {
  let leiturasIniciais: LeituraVegetacao[] = [];
  let sincronizadoEmInicial: string | null = null;
  let erroInicial: string | null = null;

  try {
    leiturasIniciais = await carregarLeiturasDashboard();
    sincronizadoEmInicial = new Date().toISOString();
  } catch (erro) {
    console.error("Falha ao carregar os dados do monitoramento:", erro);
    erroInicial = "Não foi possível carregar os dados.";
  }

  return (
    <MonitoramentoInterativo
      leiturasIniciais={leiturasIniciais}
      sincronizadoEmInicial={sincronizadoEmInicial}
      erroInicial={erroInicial}
    />
  );
}
