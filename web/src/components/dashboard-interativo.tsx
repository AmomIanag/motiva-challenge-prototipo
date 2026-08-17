"use client";

import { useMemo, useState } from "react";

import {
  excluirLeituraAcao,
  limparHistoricoAcao,
} from "@/app/acoes-leituras";
import { AnaliseLeituras } from "@/components/analise-leituras";
import { CardMetrica } from "@/components/card-metrica";
import { HistoricoLeituras } from "@/components/historico-leituras";
import { IndicadorStatus } from "@/components/indicador-status";
import { VisualizadorLeitura } from "@/components/visualizador-leitura";
import {
  formatarAltura,
  formatarData,
  obterMensagemStatus,
} from "@/lib/formatadores";
import {
  FILTROS_PADRAO,
  filtrarLeituras,
  filtrosEstaoAtivos,
  type FiltrosLeituras,
} from "@/lib/filtros-leituras";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesDashboardInterativo {
  leiturasIniciais: LeituraVegetacao[];
}

export function DashboardInterativo({
  leiturasIniciais,
}: PropriedadesDashboardInterativo) {
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [filtros, setFiltros] = useState<FiltrosLeituras>(FILTROS_PADRAO);
  const ultimaLeitura = useMemo(() => leituras.at(-1) ?? null, [leituras]);
  const leiturasFiltradas = useMemo(
    () => filtrarLeituras(leituras, filtros),
    [leituras, filtros],
  );
  const dispositivos = useMemo(
    () =>
      [...new Set(leituras.map((leitura) => leitura.dispositivoId))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [leituras],
  );
  const existemFiltrosAtivos = filtrosEstaoAtivos(filtros);

  async function excluirLeitura(id: string): Promise<void> {
    await excluirLeituraAcao(id);
    setLeituras((atuais) => atuais.filter((leitura) => leitura.id !== id));
  }

  async function limparHistorico(): Promise<void> {
    await limparHistoricoAcao();
    setLeituras([]);
    setFiltros(FILTROS_PADRAO);
  }

  function limparFiltros() {
    setFiltros(FILTROS_PADRAO);
  }

  return (
    <>
      <section className="grade-metricas" aria-label="Indicadores atuais">
        <CardMetrica
          titulo="Altura atual"
          valor={ultimaLeitura ? formatarAltura(ultimaLeitura.alturaCm) : "--"}
          detalhe="Vegetação estimada"
          simbolo="↕"
        />
        <CardMetrica
          titulo="Status"
          valor={
            ultimaLeitura ? (
              <IndicadorStatus status={ultimaLeitura.status} />
            ) : (
              "--"
            )
          }
          detalhe="Condição operacional"
          simbolo="◎"
        />
        <CardMetrica
          titulo="Dispositivo"
          valor={ultimaLeitura?.dispositivoId ?? "--"}
          detalhe="Ponto monitorado"
          simbolo="◇"
        />
        <CardMetrica
          titulo="Última leitura"
          valor={ultimaLeitura ? formatarData(ultimaLeitura.medidoEm) : "--"}
          detalhe="Horário de Brasília"
          simbolo="◷"
        />
      </section>

      <section className="grade-operacional" aria-label="Resumo operacional">
        <article className="painel painel-condicao">
          <div className="painel-cabecalho">
            <div>
              <span className="rotulo-secao">Condição operacional</span>
              <h2>
                {ultimaLeitura
                  ? obterMensagemStatus(ultimaLeitura.status)
                  : "Nenhuma condição calculada"}
              </h2>
            </div>
            {ultimaLeitura ? (
              <IndicadorStatus status={ultimaLeitura.status} compacto />
            ) : null}
          </div>

          <div
            className={`escala-risco${ultimaLeitura ? ` nivel-${ultimaLeitura.status}` : ""}`}
          >
            <div><span /><small>Seguro</small></div>
            <div><span /><small>Cuidado</small></div>
            <div><span /><small>Perigo</small></div>
          </div>

          <div className="resumo-condicao">
            <div>
              <span>Altura detectada</span>
              <strong>
                {ultimaLeitura ? formatarAltura(ultimaLeitura.alturaCm) : "--"}
              </strong>
            </div>
            <div>
              <span>Origem da leitura</span>
              <strong>{ultimaLeitura?.dispositivoId ?? "--"}</strong>
            </div>
            <div>
              <span>Total no histórico</span>
              <strong>{leituras.length}</strong>
            </div>
          </div>
        </article>

        <article className="painel painel-captura">
          <div className="painel-cabecalho">
            <div>
              <span className="rotulo-secao">Registro visual</span>
              <h2>Captura da leitura</h2>
            </div>
          </div>
          <VisualizadorLeitura
            dispositivoId={ultimaLeitura?.dispositivoId ?? null}
            imagemOriginalUrl={
              ultimaLeitura?.imagemUrl ?? null
            }
            imagemAnaliseUrl={
              ultimaLeitura?.imagemDiagnosticoUrl ?? null
            }
          />
        </article>
      </section>

      <AnaliseLeituras
        leituras={leiturasFiltradas}
        totalLeituras={leituras.length}
        dispositivos={dispositivos}
        filtros={filtros}
        filtrosAtivos={existemFiltrosAtivos}
        aoAlterarFiltros={setFiltros}
        aoLimparFiltros={limparFiltros}
      />

      <HistoricoLeituras
        leituras={leiturasFiltradas}
        totalLeituras={leituras.length}
        filtrosAtivos={existemFiltrosAtivos}
        aoLimparFiltros={limparFiltros}
        aoExcluirLeitura={excluirLeitura}
        aoLimparHistorico={limparHistorico}
      />
    </>
  );
}
