import type { Metadata } from "next";

import { CampoOperacional } from "@/components/campo-operacional";
import { carregarDadosIntervencoes } from "@/lib/api";
import type { Intervencao } from "@/types/intervencao";

export const metadata: Metadata = { title: "Serviços em campo" };

export default async function PaginaCampo() {
  let intervencoes: Intervencao[] = [];
  let sincronizadoEm: string | null = null;
  let erroInicial: string | null = null;

  try {
    const dados = await carregarDadosIntervencoes();
    intervencoes = dados.intervencoes;
    sincronizadoEm = dados.sincronizadoEm;
  } catch {
    erroInicial = "Não foi possível carregar os serviços.";
  }

  return (
    <CampoOperacional
      intervencoesIniciais={intervencoes}
      sincronizadoEmInicial={sincronizadoEm}
      erroInicial={erroInicial}
    />
  );
}
