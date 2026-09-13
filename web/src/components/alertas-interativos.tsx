"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { atualizarAlertasAcao } from "@/app/acoes-alertas";
import { criarIntervencaoAcao } from "@/app/acoes-intervencoes";
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
import type { Intervencao } from "@/types/intervencao";

type FiltroAlertas = "todos" | NivelAlerta;

interface PropriedadesAlertasInterativos {
  leiturasIniciais: LeituraVegetacao[];
  dispositivosIniciais: Dispositivo[];
  intervencoesIniciais: Intervencao[];
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

function CardAlerta({
  alerta,
  intervencao,
  criando,
  bloqueado,
  aoCriarIntervencao,
}: {
  alerta: AlertaOperacional;
  intervencao: Intervencao | null;
  criando: boolean;
  bloqueado: boolean;
  aoCriarIntervencao: (leituraId: string) => void;
}) {
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
          <div className="acoes-alerta">
            {coordenadasValidas(dispositivo) ? (
              <Link className="acao-ver-mapa" href="/mapa">Ver no mapa</Link>
            ) : null}
            {intervencao ? (
              <Link className="acao-intervencao-criada" href={`/intervencoes#intervencao-${intervencao.id}`}>
                Ver intervenção
              </Link>
            ) : (
              <button
                className="botao-criar-intervencao"
                type="button"
                disabled={bloqueado}
                onClick={() => aoCriarIntervencao(leitura.id)}
                aria-label={`Criar intervenção para a leitura ${leitura.id} do dispositivo ${dispositivoId}`}
              >
                {criando ? "Criando…" : "Criar intervenção"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function AlertasInterativos({
  leiturasIniciais,
  dispositivosIniciais,
  intervencoesIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesAlertasInterativos) {
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [dispositivos, setDispositivos] = useState(dispositivosIniciais);
  const [intervencoes, setIntervencoes] = useState(intervencoesIniciais);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erroAtualizacao, setErroAtualizacao] = useState(erroInicial);
  const [atualizando, setAtualizando] = useState(false);
  const [criandoLeituraId, setCriandoLeituraId] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroAlertas>("todos");
  const atualizacaoEmAndamento = useRef(false);
  const criacaoEmAndamento = useRef(false);

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
    if (atualizacaoEmAndamento.current || criacaoEmAndamento.current) return;

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErroAtualizacao(null);
    setSucesso(null);

    try {
      const resultado = await atualizarAlertasAcao();
      setLeituras(resultado.leituras);
      setDispositivos(resultado.dispositivos);
      setIntervencoes(resultado.intervencoes);
      setSincronizadoEm(resultado.sincronizadoEm);
    } catch {
      setErroAtualizacao("Não foi possível atualizar os alertas.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  async function criarIntervencaoParaLeitura(leituraId: string) {
    if (criacaoEmAndamento.current || atualizacaoEmAndamento.current) return;

    criacaoEmAndamento.current = true;
    setCriandoLeituraId(leituraId);
    setErroAtualizacao(null);
    setSucesso(null);

    try {
      const resultado = await criarIntervencaoAcao(leituraId);
      if (!resultado.sucesso) {
        setErroAtualizacao(resultado.erro);
        return;
      }

      setIntervencoes((atuais) => [resultado.intervencao, ...atuais]);
      setSucesso(`Intervenção #${resultado.intervencao.id} criada com sucesso.`);
      setSincronizadoEm(new Date().toISOString());
    } catch (falha) {
      setErroAtualizacao(
        falha instanceof Error ? falha.message : "Não foi possível criar a intervenção.",
      );
    } finally {
      criacaoEmAndamento.current = false;
      setCriandoLeituraId(null);
    }
  }

  return (
    <div
      className="dashboard-interativo alertas-interativos"
      aria-busy={atualizando || criandoLeituraId !== null}
    >
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
          {sucesso ? (
            <div className="aviso-sucesso" role="status">
              <span>{sucesso}</span>
              <Link href="/intervencoes">Ver intervenções</Link>
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
                  <CardAlerta
                    key={alerta.dispositivoId}
                    alerta={alerta}
                    intervencao={
                      intervencoes.find(
                        ({ leituraId }) => leituraId === alerta.leitura.id,
                      ) ?? null
                    }
                    criando={criandoLeituraId === alerta.leitura.id}
                    bloqueado={criandoLeituraId !== null || atualizando}
                    aoCriarIntervencao={criarIntervencaoParaLeitura}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
