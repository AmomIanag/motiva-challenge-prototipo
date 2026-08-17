"use client";

import { useMemo, useRef, useState } from "react";

import {
  atualizarDashboardAcao,
  excluirLeituraAcao,
  limparHistoricoAcao,
} from "@/app/acoes-leituras";
import { AnaliseLeituras } from "@/components/analise-leituras";
import { CardMetrica } from "@/components/card-metrica";
import { ControleTema } from "@/components/controle-tema";
import { HistoricoLeituras } from "@/components/historico-leituras";
import { IndicadorStatus } from "@/components/indicador-status";
import { VisualizadorLeitura } from "@/components/visualizador-leitura";
import {
  formatarAltura,
  formatarData,
  formatarHorario,
  obterMensagemStatus,
} from "@/lib/formatadores";
import {
  FILTROS_PADRAO,
  filtrarLeituras,
  filtrosEstaoAtivos,
  TODOS_DISPOSITIVOS,
  type FiltrosLeituras,
} from "@/lib/filtros-leituras";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesDashboardInterativo {
  leiturasIniciais: LeituraVegetacao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

function IconeAtualizar({ atualizando }: { atualizando: boolean }) {
  return (
    <svg
      className={atualizando ? "icone-atualizar girando" : "icone-atualizar"}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.4 7.2A8 8 0 1 0 20 14h-2a6 6 0 1 1-1.2-4L14 12h7V5l-2.6 2.2Z" />
    </svg>
  );
}

export function DashboardInterativo({
  leiturasIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesDashboardInterativo) {
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [filtros, setFiltros] = useState<FiltrosLeituras>(FILTROS_PADRAO);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erroAtualizacao, setErroAtualizacao] = useState(erroInicial);
  const [atualizando, setAtualizando] = useState(false);
  const atualizacaoEmAndamento = useRef(false);
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
  const cargaInicialFalhou = sincronizadoEm === null && erroAtualizacao !== null;

  async function atualizarDashboard(): Promise<void> {
    if (atualizacaoEmAndamento.current) {
      return;
    }

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErroAtualizacao(null);

    try {
      const resultado = await atualizarDashboardAcao();
      const dispositivosAtualizados = new Set(
        resultado.leituras.map((leitura) => leitura.dispositivoId),
      );

      setLeituras(resultado.leituras);
      setSincronizadoEm(resultado.sincronizadoEm);
      setFiltros((filtrosAtuais) =>
        filtrosAtuais.dispositivoId === TODOS_DISPOSITIVOS ||
        dispositivosAtualizados.has(filtrosAtuais.dispositivoId)
          ? filtrosAtuais
          : { ...filtrosAtuais, dispositivoId: TODOS_DISPOSITIVOS },
      );
    } catch {
      setErroAtualizacao("Não foi possível atualizar os dados.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

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
    <div className="dashboard-interativo" aria-busy={atualizando}>
      <header className="cabecalho-dashboard">
        <div>
          <span className="rotulo-pagina">Centro de operações</span>
          <h1>Visão geral</h1>
          <p>Acompanhamento da vegetação na faixa de domínio rodoviário.</p>
        </div>
        <div className="acoes-cabecalho">
          <div className="estado-sincronizacao" role="status" aria-live="polite">
            <span className="selo-ambiente">
              <span aria-hidden="true">+</span>
              Plataforma integrada
            </span>
            <span className="horario-sincronizacao">
              {sincronizadoEm
                ? `Atualizado às ${formatarHorario(sincronizadoEm)}`
                : "Dados ainda não sincronizados"}
            </span>
          </div>
          <button
            type="button"
            className="botao-atualizar"
            disabled={atualizando}
            aria-label={atualizando ? "Atualizando dados" : "Atualizar dados do dashboard"}
            onClick={atualizarDashboard}
          >
            <IconeAtualizar atualizando={atualizando} />
            <span>{atualizando ? "Atualizando…" : "Atualizar"}</span>
          </button>
          <ControleTema />
        </div>
      </header>

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar os dados</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            type="button"
            className="botao-tentar-novamente"
            disabled={atualizando}
            onClick={atualizarDashboard}
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
              <button
                type="button"
                disabled={atualizando}
                onClick={atualizarDashboard}
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grade-metricas" aria-label="Indicadores da última leitura global">
            <CardMetrica
              titulo="Altura atual"
              valor={ultimaLeitura ? formatarAltura(ultimaLeitura.alturaCm) : "--"}
              detalhe="Vegetação estimada"
              simbolo="↕"
            />
            <CardMetrica
              titulo="Status"
              valor={ultimaLeitura ? <IndicadorStatus status={ultimaLeitura.status} /> : "--"}
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
                {ultimaLeitura ? <IndicadorStatus status={ultimaLeitura.status} compacto /> : null}
              </div>

              <div className={`escala-risco${ultimaLeitura ? ` nivel-${ultimaLeitura.status}` : ""}`}>
                <div><span /><small>Seguro</small></div>
                <div><span /><small>Cuidado</small></div>
                <div><span /><small>Perigo</small></div>
              </div>

              <div className="resumo-condicao">
                <div>
                  <span>Altura detectada</span>
                  <strong>{ultimaLeitura ? formatarAltura(ultimaLeitura.alturaCm) : "--"}</strong>
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
              <VisualizadorLeitura leitura={ultimaLeitura} />
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
      )}
    </div>
  );
}
