import type { Metadata } from "next";

import { DispositivosOperacionais } from "@/components/dispositivos-operacionais";
import { carregarDadosDispositivos } from "@/lib/api";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

export const metadata: Metadata = { title: "Dispositivos" };

export default async function PaginaDispositivos() {
  let dispositivos: Dispositivo[] = [];
  let leituras: LeituraVegetacao[] = [];
  let sincronizadoEm: string | null = null;
  let erroInicial: string | null = null;

  try {
    const dados = await carregarDadosDispositivos();
    dispositivos = dados.dispositivos;
    leituras = dados.leituras;
    sincronizadoEm = new Date().toISOString();
  } catch {
    erroInicial = "Não foi possível carregar os dispositivos.";
  }

  return (
    <DispositivosOperacionais
      dispositivosIniciais={dispositivos}
      leiturasIniciais={leituras}
      sincronizadoEmInicial={sincronizadoEm}
      erroInicial={erroInicial}
    />
  );
}
