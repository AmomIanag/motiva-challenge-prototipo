"use client";

import { GraficoEvolucao } from "@/components/grafico-evolucao";
import { FiltrosLeiturasForm } from "@/components/filtros-leituras-form";
import type { FiltrosLeituras } from "@/lib/filtros-leituras";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesAnaliseLeituras {
  leituras: LeituraVegetacao[];
  totalLeituras: number;
  dispositivos: string[];
  filtros: FiltrosLeituras;
  filtrosAtivos: boolean;
  aoAlterarFiltros: (filtros: FiltrosLeituras) => void;
  aoLimparFiltros: () => void;
}

export function AnaliseLeituras({
  leituras,
  totalLeituras,
  dispositivos,
  filtros,
  filtrosAtivos,
  aoAlterarFiltros,
  aoLimparFiltros,
}: PropriedadesAnaliseLeituras) {
  return (
    <section className="painel painel-analise" aria-labelledby="titulo-analise">
      <div className="painel-cabecalho cabecalho-analise">
        <div>
          <span className="rotulo-secao">Análise temporal</span>
          <h2 id="titulo-analise">Evolução da vegetação</h2>
          <p className="subtitulo-painel">Altura detectada ao longo do tempo</p>
        </div>
        <div className="metadados-analise">
          <span className="contador-registros">
            {filtrosAtivos
              ? `${leituras.length} de ${totalLeituras} leituras`
              : `${totalLeituras} ${totalLeituras === 1 ? "registro" : "registros"}`}
          </span>
          <span className="aviso-faixas">Faixas experimentais do protótipo</span>
        </div>
      </div>

      <FiltrosLeiturasForm
        dispositivos={dispositivos}
        filtros={filtros}
        filtrosAtivos={filtrosAtivos}
        aoAlterarFiltros={aoAlterarFiltros}
        aoLimparFiltros={aoLimparFiltros}
      />

      <GraficoEvolucao
        leituras={leituras}
        existemLeiturasNoSistema={totalLeituras > 0}
      />
    </section>
  );
}
