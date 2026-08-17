"use client";

import { GraficoEvolucao } from "@/components/grafico-evolucao";
import {
  TODOS_DISPOSITIVOS,
  type FiltroPeriodo,
  type FiltroStatus,
  type FiltrosLeituras,
} from "@/lib/filtros-leituras";
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
  function alterarFiltro<Chave extends keyof FiltrosLeituras>(
    chave: Chave,
    valor: FiltrosLeituras[Chave],
  ) {
    aoAlterarFiltros({ ...filtros, [chave]: valor });
  }

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

      <div className="filtros-leituras" aria-label="Filtros das leituras">
        <label>
          <span>Status</span>
          <select
            value={filtros.status}
            onChange={(evento) =>
              alterarFiltro("status", evento.target.value as FiltroStatus)
            }
          >
            <option value="todos">Todos</option>
            <option value="seguro">Seguro</option>
            <option value="cuidado">Cuidado</option>
            <option value="perigo">Perigo</option>
          </select>
        </label>

        <label>
          <span>Dispositivo</span>
          <select
            value={filtros.dispositivoId}
            onChange={(evento) =>
              alterarFiltro("dispositivoId", evento.target.value)
            }
          >
            <option value={TODOS_DISPOSITIVOS}>Todos os dispositivos</option>
            {dispositivos.map((dispositivo) => (
              <option key={dispositivo} value={dispositivo}>{dispositivo}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Período</span>
          <select
            value={filtros.periodo}
            onChange={(evento) =>
              alterarFiltro("periodo", evento.target.value as FiltroPeriodo)
            }
          >
            <option value="todo">Todo o período</option>
            <option value="hoje">Hoje</option>
            <option value="7-dias">Últimos 7 dias</option>
            <option value="30-dias">Últimos 30 dias</option>
          </select>
        </label>

        {filtrosAtivos ? (
          <button
            type="button"
            className="botao-limpar-filtros"
            onClick={aoLimparFiltros}
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      <GraficoEvolucao
        leituras={leituras}
        existemLeiturasNoSistema={totalLeituras > 0}
      />
    </section>
  );
}
