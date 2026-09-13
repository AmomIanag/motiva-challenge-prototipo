import type { Metadata } from "next";

import { ControleTema } from "@/components/controle-tema";
import { MapaGeorreferenciado } from "@/components/mapa-georreferenciado";
import { carregarDispositivos, carregarLeituras } from "@/lib/api";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

export const metadata: Metadata = { title: "Mapa" };

export default async function PaginaMapa() {
  let dispositivos: Dispositivo[] = [];
  let leituras: LeituraVegetacao[] = [];
  let erroDispositivos: string | null = null;
  let erroLeituras: string | null = null;

  const [resultadoDispositivos, resultadoLeituras] = await Promise.allSettled([
    carregarDispositivos(),
    carregarLeituras(),
  ]);

  if (resultadoDispositivos.status === "fulfilled") {
    dispositivos = resultadoDispositivos.value;
  } else {
    erroDispositivos =
      resultadoDispositivos.reason instanceof Error
        ? resultadoDispositivos.reason.message
        : "Não foi possível consultar os dispositivos.";
  }

  if (resultadoLeituras.status === "fulfilled") {
    leituras = resultadoLeituras.value;
  } else {
    erroLeituras =
      resultadoLeituras.reason instanceof Error
        ? resultadoLeituras.reason.message
        : "Não foi possível consultar as leituras.";
  }

  return (
    <>
      <header className="cabecalho-dashboard cabecalho-pagina-placeholder">
        <div>
          <span className="rotulo-pagina">Estrutura geográfica</span>
          <h1>Mapa</h1>
          <p>Visualização georreferenciada dos pontos monitorados.</p>
        </div>
        <div className="acoes-cabecalho">
          <ControleTema />
        </div>
      </header>

      <MapaGeorreferenciado
        dispositivosIniciais={dispositivos}
        leiturasIniciais={leituras}
        erroDispositivos={erroDispositivos}
        erroLeituras={erroLeituras}
      />
    </>
  );
}
