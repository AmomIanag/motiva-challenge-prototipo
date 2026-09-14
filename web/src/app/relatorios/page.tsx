import type { Metadata } from "next";

import { RelatoriosOperacionais } from "@/components/relatorios-operacionais";
import { carregarDadosRelatorios } from "@/lib/api";
import type { Dispositivo } from "@/types/dispositivo";
import type { Intervencao } from "@/types/intervencao";
import type { LeituraVegetacao } from "@/types/leitura";

export const metadata: Metadata = { title: "Relatórios" };

export default async function PaginaRelatorios() {
  let leituras: LeituraVegetacao[] = [];
  let dispositivos: Dispositivo[] = [];
  let intervencoes: Intervencao[] = [];
  let sincronizadoEm: string | null = null;
  let erroInicial: string | null = null;

  try {
    const dados = await carregarDadosRelatorios();
    leituras = dados.leituras;
    dispositivos = dados.dispositivos;
    intervencoes = dados.intervencoes;
    sincronizadoEm = new Date().toISOString();
  } catch {
    erroInicial = "Não foi possível carregar os relatórios.";
  }

  return (
    <RelatoriosOperacionais
      leiturasIniciais={leituras}
      dispositivosIniciais={dispositivos}
      intervencoesIniciais={intervencoes}
      sincronizadoEmInicial={sincronizadoEm}
      erroInicial={erroInicial}
    />
  );
}
