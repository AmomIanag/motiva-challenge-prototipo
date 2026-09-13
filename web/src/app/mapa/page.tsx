import type { Metadata } from "next";

import { ConfiguracaoLocalizacao } from "@/components/configuracao-localizacao";
import { ControleTema } from "@/components/controle-tema";
import { carregarDispositivos } from "@/lib/api";
import type { Dispositivo } from "@/types/dispositivo";

export const metadata: Metadata = { title: "Mapa" };

export default async function PaginaMapa() {
  let dispositivos: Dispositivo[] = [];
  let erroInicial: string | null = null;

  try {
    dispositivos = await carregarDispositivos();
  } catch (falha) {
    erroInicial =
      falha instanceof Error
        ? falha.message
        : "Não foi possível consultar os dispositivos.";
  }

  return (
    <>
      <header className="cabecalho-dashboard cabecalho-pagina-placeholder">
        <div>
          <span className="rotulo-pagina">Estrutura geográfica</span>
          <h1>Mapa</h1>
          <p>Configure a localização dos dispositivos instalados em campo.</p>
        </div>
        <div className="acoes-cabecalho">
          <ControleTema />
        </div>
      </header>

      <ConfiguracaoLocalizacao
        dispositivosIniciais={dispositivos}
        erroInicial={erroInicial}
      />
    </>
  );
}
