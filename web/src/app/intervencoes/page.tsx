import type { Metadata } from "next";

import { IntervencoesInterativas } from "@/components/intervencoes-interativas";
import { carregarDadosIntervencoes } from "@/lib/api";
import type { Intervencao } from "@/types/intervencao";

export const metadata: Metadata = { title: "Intervenções" };

export default async function PaginaIntervencoes() {
  let intervencoes: Intervencao[] = [];
  let sincronizadoEm: string | null = null;
  let erroInicial: string | null = null;

  try {
    const dados = await carregarDadosIntervencoes();
    intervencoes = dados.intervencoes;
    sincronizadoEm = dados.sincronizadoEm;
  } catch {
    erroInicial = "Não foi possível carregar os dados iniciais.";
  }

  return (
    <IntervencoesInterativas
      intervencoesIniciais={intervencoes}
      sincronizadoEmInicial={sincronizadoEm}
      erroInicial={erroInicial}
    />
  );
}
