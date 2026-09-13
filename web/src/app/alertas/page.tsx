import type { Metadata } from "next";

import { AlertasInterativos } from "@/components/alertas-interativos";
import { carregarDadosAlertas } from "@/lib/api";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

export const metadata: Metadata = { title: "Alertas" };

export default async function PaginaAlertas() {
  let leituras: LeituraVegetacao[] = [];
  let dispositivos: Dispositivo[] = [];
  let sincronizadoEm: string | null = null;
  let erroInicial: string | null = null;

  try {
    const dados = await carregarDadosAlertas();
    leituras = dados.leituras;
    dispositivos = dados.dispositivos;
    sincronizadoEm = new Date().toISOString();
  } catch {
    erroInicial = "Não foi possível carregar os dados iniciais.";
  }

  return (
    <AlertasInterativos
      leiturasIniciais={leituras}
      dispositivosIniciais={dispositivos}
      sincronizadoEmInicial={sincronizadoEm}
      erroInicial={erroInicial}
    />
  );
}
