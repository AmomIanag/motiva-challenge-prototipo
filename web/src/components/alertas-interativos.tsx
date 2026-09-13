"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { atualizarAlertasAcao } from "@/app/acoes-alertas";
import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { IndicadorStatus } from "@/components/indicador-status";
import {
  derivarAlertasOperacionais,
  type AlertaOperacional,
  type NivelAlerta,
} from "@/lib/alertas-operacionais";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

type FiltroAlertas = "todos" | NivelAlerta;

interface PropriedadesAlertasInterativos {
  leiturasIniciais: LeituraVegetacao[];
  dispositivosIniciais: Dispositivo[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

function coordenadasValidas(dispositivo: Dispositivo | null): boolean {
  return Boolean(
    dispositivo &&
      dispositivo.latitude !== null &&
      dispositivo.longitude !== null &&
      Number.isFinite(dispositivo.latitude) &&
      Number.isFinite(dispositivo.longitude),
  );
}

function descricaoLocalizacao(dispositivo: Dispositivo | null): string {
  if (!dispositivo) return "Localização operacional não cadastrada";

  const partes = [
    dispositivo.rodovia,
    dispositivo.km ? `Km ${dispositivo.km}` : null,
    dispositivo.sentido ? `Sentido ${dispositivo.sentido}` : null,
  ].filter(Boolean);

  return partes.join(" · ") || "Localização operacional não cadastrada";
}

function CardAlerta({ alerta }: { alerta: AlertaOperacional }) {
  const { dispositivo, dispositivoId, leitura, nivel } = alerta;

  return (
    <article className={`card-alerta alerta-${nivel}`}>
      <div className="card-alerta-faixa" aria-hidden="true" />
      <div className="card-alerta-conteudo">
        <div className="card-alerta-topo">
          <div className="identificacao-alerta">
            <span className="icone-nivel-alerta" aria-hidden="true">!</span>
            <div>
              <span className="rotulo-nivel-alerta">
                {nivel === "critico" ? "Alerta crítico" : "Alerta de atenção"}
              </span>
              <h2>{dispositivoId}</h2>
            </div>
          </div>
          <IndicadorStatus status={leitura.status} compacto />
        </div>

        <div className="altura-alerta">
          <span>Altura registrada</span>
          <strong>{formatarAltura(leitura.alturaCm)}</strong>
        </div>

        <div className="localizacao-alerta">
          <span className="localizacao-alerta-icone" aria-hidden="true">⌖</span>
          <div>
            <strong>{descricaoLocalizacao(dispositivo)}</strong>
            {dispositivo?.trecho ? <span>{dispositivo.trecho}</span> : null}
          </div>
        </div>

        <div className="rodape-alerta">
          <div>
            <span>Última leitura</span>
            <time dateTime={leitura.medidoEm}>{formatarData(leitura.medidoEm)}</time>
          </div>
          {coordenadasValidas(dispositivo) ? (
            <Link className="acao-ver-mapa" href="/mapa">
              Ver no mapa
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AlertasInterativos({
  leiturasIniciais,
  dispositivosIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesAlertasInterativos) {
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [dispositivos, setDispositivos] = useState(dispositivosIniciais);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erroAtualizacao, setErroAtualizacao] = useState(erroInicial);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroAlertas>("todos");
  const atualizacaoEmAndamento = useRef(false);

  const alertas = useMemo(
    () => derivarAlertasOperacionais(leituras, dispositivos),
    [dispositivos, leituras],
  );
  const alertasCriticos = alertas.filter(({ nivel }) => nivel === "critico");
  const alertasAtencao = alertas.filter(({ nivel }) => nivel === "atencao");
  const alertasFiltrados =
    filtro === "todos"
      ? alertas
      : alertas.filter(({ nivel }) => nivel === filtro);
  const cargaInicialFalhou = sincronizadoEm === null && erroAtualizacao !== null;

  async function atualizarAlertas() {
    if (atualizacaoEmAndamento.current) return;

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErroAtualizacao(null);

    try {
      const resultado = await atualizarAlertasAcao();
      setLeituras(resultado.leituras);
      setDispositivos(resultado.dispositivos);
      setSincronizadoEm(resultado.sincronizadoEm);
    } catch {
      setErroAtualizacao("Não foi possível atualizar os alertas.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  return (
    <div className="dashboard-interativo alertas-interativos" aria-busy={atualizando}>
      <CabecalhoPaginaDados
        rotulo="Acompanhamento operacional"
        titulo="Alertas"
        descricao="Situações que exigem acompanhamento operacional."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarAlertas}
      />

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar os alertas</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            type="button"
            className="botao-tentar-novamente"
            disabled={atualizando}
            onClick={atualizarAlertas}
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
              <button type="button" disabled={atualizando} onClick={atualizarAlertas}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grade-resumo-alertas" aria-label="Resumo dos alertas ativos">
            <article className="card-resumo-alerta resumo-alertas-ativos">
              <span>Alertas ativos</span>
              <strong>{alertas.length}</strong>
              <small>Situações que exigem acompanhamento</small>
            </article>
            <article className="card-resumo-alerta resumo-alertas-criticos">
              <span>Alertas críticos</span>
              <strong>{alertasCriticos.length}</strong>
              <small>Leituras atuais em perigo</small>
            </article>
            <article className="card-resumo-alerta resumo-alertas-atencao">
              <span>Alertas de atenção</span>
              <strong>{alertasAtencao.length}</strong>
              <small>Leituras atuais em cuidado</small>
            </article>
          </section>

          <section className="painel painel-lista-alertas" aria-labelledby="titulo-lista-alertas">
            <div className="painel-cabecalho cabecalho-lista-alertas">
              <div>
                <span className="rotulo-secao">Prioridade operacional</span>
                <h2 id="titulo-lista-alertas">Alertas ativos</h2>
                <p className="subtitulo-painel">
                  Ordenados por criticidade e horário da leitura mais recente.
                </p>
              </div>
              {alertas.length > 0 ? (
                <div className="filtros-alertas" aria-label="Filtrar alertas">
                  {([
                    ["todos", "Todos"],
                    ["critico", "Críticos"],
                    ["atencao", "Atenção"],
                  ] as const).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtro === valor}
                      onClick={() => setFiltro(valor)}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {leituras.length === 0 ? (
              <div className="estado-alertas-vazio">
                <span className="estado-icone" aria-hidden="true">◎</span>
                <h3>Nenhuma leitura registrada</h3>
                <p>Os alertas serão avaliados após a primeira leitura de um dispositivo.</p>
              </div>
            ) : alertas.length === 0 ? (
              <div className="estado-alertas-vazio estado-alertas-seguro">
                <span className="estado-icone" aria-hidden="true">✓</span>
                <h3>Nenhum alerta ativo no momento</h3>
                <p>As leituras mais recentes dos dispositivos estão em estado seguro.</p>
              </div>
            ) : alertasFiltrados.length === 0 ? (
              <div className="estado-alertas-vazio">
                <h3>Nenhum alerta neste filtro</h3>
                <p>Escolha outro nível para consultar os alertas ativos.</p>
              </div>
            ) : (
              <div className="lista-alertas">
                {alertasFiltrados.map((alerta) => (
                  <CardAlerta key={alerta.dispositivoId} alerta={alerta} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
