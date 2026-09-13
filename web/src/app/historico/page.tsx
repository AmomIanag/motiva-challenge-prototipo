import type { Metadata } from "next";

import { HistoricoInterativo } from "@/components/historico-interativo";
import { carregarLeiturasDashboard } from "@/lib/api";
import type { LeituraVegetacao } from "@/types/leitura";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Histórico" };

export default async function PaginaHistorico() {
  let leiturasIniciais: LeituraVegetacao[] = [];
  let sincronizadoEmInicial: string | null = null;
  let erroInicial: string | null = null;

  try {
    leiturasIniciais = await carregarLeiturasDashboard();
    sincronizadoEmInicial = new Date().toISOString();
  } catch (erro) {
    console.error("Falha ao carregar os dados do histórico:", erro);
    erroInicial = "Não foi possível carregar os dados.";
  }

  return (
    <HistoricoInterativo
      leiturasIniciais={leiturasIniciais}
      sincronizadoEmInicial={sincronizadoEmInicial}
      erroInicial={erroInicial}
    />
  );
}
