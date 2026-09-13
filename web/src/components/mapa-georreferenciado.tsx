"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";

import { ConfiguracaoLocalizacao } from "@/components/configuracao-localizacao";
import {
  formatarAltura,
  formatarData,
  obterRotuloStatus,
} from "@/lib/formatadores";
import {
  criarPontosMonitorados,
  type PontoMonitorado,
} from "@/lib/pontos-monitorados";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

const MapaLeaflet = dynamic(
  () => import("@/components/mapa-leaflet").then((modulo) => modulo.MapaLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="mapa-carregando" role="status">
        Carregando mapa…
      </div>
    ),
  },
);

interface PropriedadesMapaGeorreferenciado {
  dispositivosIniciais: Dispositivo[];
  leiturasIniciais: LeituraVegetacao[];
  erroDispositivos: string | null;
  erroLeituras: string | null;
}

interface PropriedadesLimiteErroMapa {
  children: ReactNode;
  chaveRecuperacao: string;
}

class LimiteErroMapa extends Component<
  PropriedadesLimiteErroMapa,
  { falhou: boolean }
> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidUpdate(propriedadesAnteriores: PropriedadesLimiteErroMapa) {
    if (
      this.state.falhou &&
      propriedadesAnteriores.chaveRecuperacao !== this.props.chaveRecuperacao
    ) {
      this.setState({ falhou: false });
    }
  }

  componentDidCatch(erro: unknown) {
    console.error("Erro isolado ao renderizar o mapa:", erro);
  }

  render() {
    if (this.state.falhou) {
      return (
        <div className="mapa-indisponivel" role="alert">
          <strong>Não foi possível exibir o mapa.</strong>
          <span>
            Os detalhes dos pontos e a configuração continuam disponíveis.
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}

function textoOuFallback(valor: string | null, fallback: string): string {
  return valor?.trim() || fallback;
}

function DetalhesPonto({
  ponto,
  leiturasIndisponiveis,
}: {
  ponto: PontoMonitorado;
  leiturasIndisponiveis: boolean;
}) {
  const { dispositivo, ultimaLeitura } = ponto;

  return (
    <article className="detalhes-ponto" aria-live="polite">
      <div className="detalhes-ponto-topo">
        <div>
          <span className="rotulo-secao">Ponto selecionado</span>
          <h3>{dispositivo.dispositivoId}</h3>
        </div>
        {ultimaLeitura ? (
          <span className={`indicador-status status-${ultimaLeitura.status}`}>
            <span className="indicador-status-ponto" />
            {obterRotuloStatus(ultimaLeitura.status)}
          </span>
        ) : (
          <span className="indicador-status status-neutro">
            <span className="indicador-status-ponto" />
            {leiturasIndisponiveis ? "Leituras indisponíveis" : "Sem leitura"}
          </span>
        )}
      </div>

      <dl className="dados-ponto">
        <div>
          <dt>Altura mais recente</dt>
          <dd>
            {ultimaLeitura
              ? formatarAltura(ultimaLeitura.alturaCm)
              : leiturasIndisponiveis
                ? "Indisponível"
                : "Sem leitura"}
          </dd>
        </div>
        <div>
          <dt>Última leitura</dt>
          <dd>
            {ultimaLeitura
              ? formatarData(ultimaLeitura.medidoEm)
              : leiturasIndisponiveis
                ? "Indisponível"
                : "Não realizada"}
          </dd>
        </div>
        <div>
          <dt>Rodovia</dt>
          <dd>{textoOuFallback(dispositivo.rodovia, "Não cadastrada")}</dd>
        </div>
        <div>
          <dt>Km</dt>
          <dd>{textoOuFallback(dispositivo.km, "Não cadastrado")}</dd>
        </div>
        <div>
          <dt>Sentido</dt>
          <dd>{textoOuFallback(dispositivo.sentido, "Não cadastrado")}</dd>
        </div>
        <div>
          <dt>Trecho</dt>
          <dd>{textoOuFallback(dispositivo.trecho, "Não informado")}</dd>
        </div>
        <div>
          <dt>Latitude</dt>
          <dd>{dispositivo.latitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>{dispositivo.longitude.toFixed(6)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function MapaGeorreferenciado({
  dispositivosIniciais,
  leiturasIniciais,
  erroDispositivos,
  erroLeituras,
}: PropriedadesMapaGeorreferenciado) {
  const [dispositivos, setDispositivos] = useState(dispositivosIniciais);
  const pontos = useMemo(
    () => criarPontosMonitorados(dispositivos, leiturasIniciais),
    [dispositivos, leiturasIniciais],
  );
  const [dispositivoSelecionadoId, setDispositivoSelecionadoId] = useState<
    string | null
  >(pontos[0]?.dispositivo.dispositivoId ?? null);

  const pontoSelecionado =
    pontos.find(
      ({ dispositivo }) =>
        dispositivo.dispositivoId === dispositivoSelecionadoId,
    ) ?? pontos[0];
  const quantidadeSemCoordenadas = dispositivos.length - pontos.length;

  useEffect(() => {
    if (
      pontos.length === 0 ||
      !pontos.some(
        ({ dispositivo }) =>
          dispositivo.dispositivoId === dispositivoSelecionadoId,
      )
    ) {
      setDispositivoSelecionadoId(
        pontos[0]?.dispositivo.dispositivoId ?? null,
      );
    }
  }, [dispositivoSelecionadoId, pontos]);

  function atualizarDispositivo(dispositivoAtualizado: Dispositivo) {
    setDispositivos((atuais) =>
      atuais.map((dispositivo) =>
        dispositivo.dispositivoId === dispositivoAtualizado.dispositivoId
          ? dispositivoAtualizado
          : dispositivo,
      ),
    );

    if (
      dispositivoAtualizado.latitude !== null &&
      dispositivoAtualizado.longitude !== null
    ) {
      setDispositivoSelecionadoId(dispositivoAtualizado.dispositivoId);
    }
  }

  return (
    <div className="pagina-mapa">
      <section className="painel painel-visualizacao-mapa" aria-labelledby="titulo-pontos-mapa">
        <div className="painel-cabecalho cabecalho-visualizacao-mapa">
          <div>
            <span className="rotulo-secao">Visualização geográfica</span>
            <h2 id="titulo-pontos-mapa">Pontos monitorados</h2>
            <p>Selecione um ponto para consultar sua situação mais recente.</p>
          </div>
          {pontos.length > 0 ? (
            <span className="contador-pontos">
              {pontos.length} {pontos.length === 1 ? "ponto" : "pontos"} no mapa
            </span>
          ) : null}
        </div>

        {erroDispositivos ? (
          <div className="aviso-mapa erro" role="alert">
            <strong>Não foi possível carregar os dispositivos.</strong>
            <span>{erroDispositivos}</span>
          </div>
        ) : pontos.length === 0 ? (
          <div className="estado-sem-pontos">
            <span className="estado-icone" aria-hidden="true">⌖</span>
            <h3>Nenhum ponto possui coordenadas cadastradas</h3>
            <p>
              Configure latitude e longitude de um dispositivo para exibi-lo no
              mapa.
            </p>
            <a className="botao-configurar-localizacao" href="#configuracao-localizacao">
              Configurar localização
            </a>
          </div>
        ) : (
          <>
            {erroLeituras ? (
              <div className="aviso-mapa" role="status">
                <strong>As leituras estão temporariamente indisponíveis.</strong>
                <span>Os pontos continuam visíveis com estado neutro.</span>
              </div>
            ) : null}
            {quantidadeSemCoordenadas > 0 ? (
              <div className="aviso-mapa" role="status">
                <strong>
                  {quantidadeSemCoordenadas} {quantidadeSemCoordenadas === 1
                    ? "dispositivo ainda precisa"
                    : "dispositivos ainda precisam"} de localização.
                </strong>
                <a href="#configuracao-localizacao">Configurar</a>
              </div>
            ) : null}

            <div className="grade-visualizacao-mapa">
              <LimiteErroMapa
                chaveRecuperacao={pontos
                  .map(
                    ({ dispositivo }) =>
                      `${dispositivo.dispositivoId}:${dispositivo.latitude}:${dispositivo.longitude}`,
                  )
                  .join("|")}
              >
                <MapaLeaflet
                  pontos={pontos}
                  dispositivoSelecionadoId={dispositivoSelecionadoId}
                  aoSelecionar={setDispositivoSelecionadoId}
                />
              </LimiteErroMapa>

              <aside className="painel-lateral-pontos" aria-label="Detalhes e lista dos pontos">
                {pontoSelecionado ? (
                  <DetalhesPonto
                    ponto={pontoSelecionado}
                    leiturasIndisponiveis={Boolean(erroLeituras)}
                  />
                ) : null}

                <div className="lista-pontos">
                  <span className="lista-pontos-titulo">Todos os pontos</span>
                  {pontos.map(({ dispositivo, ultimaLeitura }) => (
                    <button
                      key={dispositivo.dispositivoId}
                      type="button"
                      className={
                        dispositivo.dispositivoId === dispositivoSelecionadoId
                          ? "ponto-lista selecionado"
                          : "ponto-lista"
                      }
                      aria-pressed={
                        dispositivo.dispositivoId === dispositivoSelecionadoId
                      }
                      onClick={() =>
                        setDispositivoSelecionadoId(dispositivo.dispositivoId)
                      }
                    >
                      <span
                        className={`ponto-lista-indicador ${
                          ultimaLeitura
                            ? `status-${ultimaLeitura.status}`
                            : "status-neutro"
                        }`}
                      />
                      <span>
                        <strong>{dispositivo.dispositivoId}</strong>
                        <small>
                          {ultimaLeitura
                            ? obterRotuloStatus(ultimaLeitura.status)
                            : erroLeituras
                              ? "Leituras indisponíveis"
                              : "Sem leitura"}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          </>
        )}
      </section>

      <ConfiguracaoLocalizacao
        dispositivosIniciais={dispositivos}
        erroInicial={erroDispositivos}
        aoDispositivoAtualizado={atualizarDispositivo}
      />
    </div>
  );
}
