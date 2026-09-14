"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import {
  atualizarIntervencoesAcao,
  atualizarStatusIntervencaoAcao,
} from "@/app/acoes-intervencoes";
import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { IndicadorStatus } from "@/components/indicador-status";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import {
  coordenadasIntervencaoValidas,
  formatarLocalizacaoIntervencao,
  obterProximoStatusIntervencao,
  ROTULOS_STATUS_INTERVENCAO,
} from "@/lib/intervencoes";
import type { Intervencao, StatusIntervencao } from "@/types/intervencao";

type FiltroIntervencao = "todas" | StatusIntervencao;

interface PropriedadesIntervencoesInterativas {
  intervencoesIniciais: Intervencao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

const prioridadeStatus: Record<StatusIntervencao, number> = {
  pendente: 0,
  em_atendimento: 0,
  concluida: 1,
};

function ordenarIntervencoes(intervencoes: Intervencao[]): Intervencao[] {
  return [...intervencoes].sort((a, b) => {
    const status = prioridadeStatus[a.status] - prioridadeStatus[b.status];
    if (status !== 0) return status;

    const prioridade = Number(a.prioridade === "moderada") - Number(b.prioridade === "moderada");
    if (prioridade !== 0) return prioridade;

    return Date.parse(b.criadaEm) - Date.parse(a.criadaEm);
  });
}

function LinhaData({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;

  return (
    <div>
      <span>{rotulo}</span>
      <time dateTime={valor}>{formatarData(valor)}</time>
    </div>
  );
}

function CardIntervencao({
  intervencao,
  processando,
  bloqueado,
  aoAlterarStatus,
}: {
  intervencao: Intervencao;
  processando: boolean;
  bloqueado: boolean;
  aoAlterarStatus: (id: string, status: StatusIntervencao) => void;
}) {
  const proximoStatus = obterProximoStatusIntervencao(intervencao.status);

  return (
    <article
      className={`card-intervencao prioridade-${intervencao.prioridade}`}
      id={`intervencao-${intervencao.id}`}
    >
      <div className="card-intervencao-topo">
        <div>
          <span className="rotulo-intervencao">Intervenção #{intervencao.id}</span>
          <h2>{intervencao.dispositivoId}</h2>
        </div>
        <div className="selos-intervencao">
          <span className={`selo-prioridade prioridade-${intervencao.prioridade}`}>
            Prioridade {intervencao.prioridade}
          </span>
          <span className={`selo-status-intervencao status-${intervencao.status}`}>
            {ROTULOS_STATUS_INTERVENCAO[intervencao.status]}
          </span>
        </div>
      </div>

      <div className="dados-origem-intervencao">
        <div>
          <span>Altura detectada</span>
          <strong>{formatarAltura(intervencao.alturaCm)}</strong>
        </div>
        <div>
          <span>Estado da leitura</span>
          <IndicadorStatus status={intervencao.statusLeitura} compacto />
        </div>
        <div>
          <span>Detecção</span>
          <time dateTime={intervencao.medidoEm}>{formatarData(intervencao.medidoEm)}</time>
        </div>
      </div>

      <div className="localizacao-intervencao">
        <span aria-hidden="true">⌖</span>
        <div>
          <strong>{formatarLocalizacaoIntervencao(intervencao)}</strong>
          {intervencao.trecho ? <small>{intervencao.trecho}</small> : null}
        </div>
        {coordenadasIntervencaoValidas(intervencao) ? <Link href="/mapa">Ver no mapa</Link> : null}
      </div>

      <div className="datas-intervencao">
        <LinhaData rotulo="Criada" valor={intervencao.criadaEm} />
        <LinhaData rotulo="Iniciada" valor={intervencao.iniciadaEm} />
        <LinhaData rotulo="Concluída" valor={intervencao.concluidaEm} />
        <div>
          <span>Leitura de origem</span>
          <strong>{intervencao.leituraId ? `#${intervencao.leituraId}` : "Removida"}</strong>
        </div>
      </div>

      {proximoStatus ? (
        <div className="acoes-intervencao">
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => aoAlterarStatus(intervencao.id, proximoStatus)}
            aria-label={
              proximoStatus === "em_atendimento"
                ? `Iniciar atendimento da intervenção ${intervencao.id}`
                : `Concluir intervenção ${intervencao.id}`
            }
          >
            {processando
              ? "Processando…"
              : proximoStatus === "em_atendimento"
                ? "Iniciar atendimento"
                : "Concluir intervenção"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function IntervencoesInterativas({
  intervencoesIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesIntervencoesInterativas) {
  const [intervencoes, setIntervencoes] = useState(intervencoesIniciais);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erro, setErro] = useState(erroInicial);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroIntervencao>("todas");
  const atualizacaoEmAndamento = useRef(false);
  const acaoEmAndamento = useRef(false);

  const totais = useMemo(
    () => ({
      pendentes: intervencoes.filter(({ status }) => status === "pendente").length,
      emAtendimento: intervencoes.filter(({ status }) => status === "em_atendimento").length,
      concluidas: intervencoes.filter(({ status }) => status === "concluida").length,
    }),
    [intervencoes],
  );
  const intervencoesFiltradas =
    filtro === "todas"
      ? intervencoes
      : intervencoes.filter(({ status }) => status === filtro);
  const cargaInicialFalhou = sincronizadoEm === null && erro !== null;

  async function atualizarIntervencoes() {
    if (atualizacaoEmAndamento.current || acaoEmAndamento.current) return;

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErro(null);
    setSucesso(null);

    try {
      const resultado = await atualizarIntervencoesAcao();
      setIntervencoes(resultado.intervencoes);
      setSincronizadoEm(resultado.sincronizadoEm);
    } catch {
      setErro("Não foi possível atualizar as intervenções.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  async function alterarStatus(id: string, status: StatusIntervencao) {
    if (acaoEmAndamento.current || atualizacaoEmAndamento.current) return;

    acaoEmAndamento.current = true;
    setProcessandoId(id);
    setErro(null);
    setSucesso(null);

    try {
      const resultado = await atualizarStatusIntervencaoAcao(id, status);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }

      setIntervencoes((atuais) =>
        ordenarIntervencoes(
          atuais.map((intervencao) =>
            intervencao.id === id ? resultado.intervencao : intervencao,
          ),
        ),
      );
      setSucesso(
        status === "em_atendimento"
          ? `Atendimento da intervenção #${id} iniciado.`
          : `Intervenção #${id} concluída.`,
      );
      setSincronizadoEm(new Date().toISOString());
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível atualizar a intervenção.",
      );
    } finally {
      acaoEmAndamento.current = false;
      setProcessandoId(null);
    }
  }

  return (
    <div
      className="dashboard-interativo intervencoes-interativas"
      aria-busy={atualizando || processandoId !== null}
    >
      <CabecalhoPaginaDados
        rotulo="Gestão operacional"
        titulo="Intervenções"
        descricao="Acompanhe ações operacionais geradas pelas leituras de vegetação."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarIntervencoes}
      />

      <div className="atalho-modo-campo">
        <div>
          <strong>Execução em campo</strong>
          <span>Interface simplificada para acompanhar e executar os serviços.</span>
        </div>
        <Link href="/campo">Abrir modo campo</Link>
      </div>

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar as intervenções</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            className="botao-tentar-novamente"
            type="button"
            disabled={atualizando}
            onClick={atualizarIntervencoes}
          >
            {atualizando ? "Tentando novamente…" : "Tentar novamente"}
          </button>
        </section>
      ) : (
        <>
          {erro ? (
            <div className="aviso-atualizacao" role="alert">
              <div><strong>{erro}</strong><span>Os dados anteriores continuam sendo exibidos.</span></div>
              <button type="button" disabled={atualizando} onClick={atualizarIntervencoes}>
                Tentar novamente
              </button>
            </div>
          ) : null}
          {sucesso ? <div className="aviso-sucesso" role="status">{sucesso}</div> : null}

          <section className="grade-resumo-intervencoes" aria-label="Resumo das intervenções">
            {[
              ["Pendentes", totais.pendentes, "Aguardando início", "pendentes"],
              ["Em atendimento", totais.emAtendimento, "Ação em andamento", "atendimento"],
              ["Concluídas", totais.concluidas, "Ações finalizadas", "concluidas"],
              ["Total", intervencoes.length, "Registros operacionais", "total"],
            ].map(([rotulo, total, descricao, classe]) => (
              <article className={`card-resumo-intervencao resumo-${classe}`} key={rotulo}>
                <span>{rotulo}</span><strong>{total}</strong><small>{descricao}</small>
              </article>
            ))}
          </section>

          <section className="painel painel-intervencoes" aria-labelledby="titulo-lista-intervencoes">
            <div className="painel-cabecalho cabecalho-lista-intervencoes">
              <div>
                <span className="rotulo-secao">Ordens operacionais</span>
                <h2 id="titulo-lista-intervencoes">Intervenções registradas</h2>
                <p className="subtitulo-painel">Acompanhe o ciclo de atendimento de cada ocorrência.</p>
              </div>
              {intervencoes.length > 0 ? (
                <div className="filtros-intervencoes" aria-label="Filtrar intervenções">
                  {[
                    ["todas", "Todas"],
                    ["pendente", "Pendentes"],
                    ["em_atendimento", "Em atendimento"],
                    ["concluida", "Concluídas"],
                  ].map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtro === valor}
                      onClick={() => setFiltro(valor as FiltroIntervencao)}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {intervencoes.length === 0 ? (
              <div className="estado-intervencoes-vazio">
                <span className="estado-icone" aria-hidden="true">↗</span>
                <h3>Nenhuma intervenção registrada.</h3>
                <p>Intervenções podem ser criadas a partir de alertas ativos.</p>
                <Link href="/alertas">Ver alertas</Link>
              </div>
            ) : intervencoesFiltradas.length === 0 ? (
              <div className="estado-intervencoes-vazio">
                <h3>Nenhuma intervenção neste filtro</h3>
                <p>Escolha outro estado para consultar os registros operacionais.</p>
              </div>
            ) : (
              <div className="lista-intervencoes">
                {intervencoesFiltradas.map((intervencao) => (
                  <CardIntervencao
                    key={intervencao.id}
                    intervencao={intervencao}
                    processando={processandoId === intervencao.id}
                    bloqueado={processandoId !== null || atualizando}
                    aoAlterarStatus={alterarStatus}
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
