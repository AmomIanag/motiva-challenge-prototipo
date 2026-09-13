"use client";

import { useMemo } from "react";

import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { GraficoEvolucao } from "@/components/grafico-evolucao";
import { IndicadorStatus } from "@/components/indicador-status";
import { VisualizadorLeitura } from "@/components/visualizador-leitura";
import { useLeiturasAtualizaveis } from "@/hooks/use-leituras-atualizaveis";
import {
  formatarAltura,
  formatarData,
  formatarHorario,
  obterMensagemStatus,
} from "@/lib/formatadores";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesMonitoramentoInterativo {
  leiturasIniciais: LeituraVegetacao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

const QUANTIDADE_LEITURAS_RECENTES = 5;

export function MonitoramentoInterativo({
  leiturasIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesMonitoramentoInterativo) {
  const {
    atualizando,
    atualizarLeituras,
    cargaInicialFalhou,
    erroAtualizacao,
    leituras,
    sincronizadoEm,
  } = useLeiturasAtualizaveis({
    leiturasIniciais,
    sincronizadoEmInicial,
    erroInicial,
  });
  const ultimaLeitura = useMemo(() => leituras.at(-1) ?? null, [leituras]);
  const leiturasRecentes = useMemo(
    () => [...leituras].reverse().slice(0, QUANTIDADE_LEITURAS_RECENTES),
    [leituras],
  );

  return (
    <div className="dashboard-interativo monitoramento-interativo" aria-busy={atualizando}>
      <CabecalhoPaginaDados
        rotulo="Acompanhamento operacional"
        titulo="Monitoramento"
        descricao="Acompanhamento das leituras e das condições de vegetação."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarLeituras}
      />

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar o monitoramento</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            type="button"
            className="botao-tentar-novamente"
            disabled={atualizando}
            onClick={atualizarLeituras}
          >
            {atualizando ? "Tentando novamente…" : "Tentar novamente"}
          </button>
        </section>
      ) : (
        <>
          {erroAtualizacao ? (
            <div className="aviso-atualizacao" role="alert">
              <div>
                <strong>{erroAtualizacao}</strong>
                <span>Os últimos dados carregados continuam sendo exibidos.</span>
              </div>
              <button type="button" disabled={atualizando} onClick={atualizarLeituras}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grade-monitoramento-destaque" aria-label="Situação e captura mais recentes">
            <article className="painel painel-situacao-monitoramento">
              <div className="painel-cabecalho">
                <div>
                  <span className="rotulo-secao">Situação atual</span>
                  <h2>
                    {ultimaLeitura
                      ? obterMensagemStatus(ultimaLeitura.status)
                      : "Nenhuma leitura registrada"}
                  </h2>
                </div>
                {ultimaLeitura ? <IndicadorStatus status={ultimaLeitura.status} /> : null}
              </div>

              <div className="altura-monitoramento">
                <span>Altura medida</span>
                <strong>{ultimaLeitura ? formatarAltura(ultimaLeitura.alturaCm) : "--"}</strong>
              </div>

              <dl className="detalhes-monitoramento">
                <div>
                  <dt>Dispositivo</dt>
                  <dd>{ultimaLeitura?.dispositivoId ?? "--"}</dd>
                </div>
                <div>
                  <dt>Data e hora</dt>
                  <dd>
                    {ultimaLeitura ? (
                      <time dateTime={ultimaLeitura.medidoEm}>{formatarData(ultimaLeitura.medidoEm)}</time>
                    ) : "--"}
                  </dd>
                </div>
                <div>
                  <dt>Sincronização</dt>
                  <dd>{sincronizadoEm ? formatarHorario(sincronizadoEm) : "--"}</dd>
                </div>
              </dl>
            </article>

            <article className="painel painel-captura painel-captura-monitoramento">
              <div className="painel-cabecalho">
                <div>
                  <span className="rotulo-secao">Registro visual</span>
                  <h2>Captura mais recente</h2>
                  <p className="subtitulo-painel">Compare a imagem original com a análise processada.</p>
                </div>
              </div>
              <VisualizadorLeitura leitura={ultimaLeitura} />
            </article>
          </section>

          <section className="painel painel-evolucao-monitoramento" aria-labelledby="titulo-evolucao-monitoramento">
            <div className="painel-cabecalho cabecalho-analise">
              <div>
                <span className="rotulo-secao">Evolução das leituras</span>
                <h2 id="titulo-evolucao-monitoramento">Altura da vegetação ao longo do tempo</h2>
                <p className="subtitulo-painel">Acompanhamento de todas as leituras disponíveis</p>
              </div>
              <div className="metadados-analise">
                <span className="contador-registros">
                  {leituras.length} {leituras.length === 1 ? "registro" : "registros"}
                </span>
                <span className="aviso-faixas">Faixas experimentais do protótipo</span>
              </div>
            </div>
            <GraficoEvolucao
              leituras={leituras}
              existemLeiturasNoSistema={leituras.length > 0}
            />
          </section>

          <section className="painel painel-leituras-recentes" aria-labelledby="titulo-leituras-recentes">
            <div className="painel-cabecalho cabecalho-leituras-recentes">
              <div>
                <span className="rotulo-secao">Fluxo operacional</span>
                <h2 id="titulo-leituras-recentes">Leituras recentes</h2>
                <p className="subtitulo-painel">Últimos registros recebidos pela plataforma</p>
              </div>
              {leituras.length > 0 ? (
                <span className="contador-registros">Exibindo {leiturasRecentes.length}</span>
              ) : null}
            </div>

            {leiturasRecentes.length > 0 ? (
              <ol className="lista-leituras-recentes">
                {leiturasRecentes.map((leitura) => (
                  <li key={leitura.id}>
                    <div className="momento-leitura-recente">
                      <time dateTime={leitura.medidoEm}>{formatarData(leitura.medidoEm)}</time>
                      <span>{leitura.dispositivoId}</span>
                    </div>
                    <strong>{formatarAltura(leitura.alturaCm)}</strong>
                    <IndicadorStatus status={leitura.status} compacto />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="estado-vazio-monitoramento">
                <span className="estado-icone" aria-hidden="true">◎</span>
                <strong>Nenhuma leitura disponível</strong>
                <p>As leituras recentes aparecerão aqui após a primeira captura do dispositivo.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
