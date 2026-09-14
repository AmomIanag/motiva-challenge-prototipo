"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import {
  atualizarIntervencoesAcao,
  atualizarStatusIntervencaoAcao,
} from "@/app/acoes-intervencoes";
import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { IndicadorStatus } from "@/components/indicador-status";
import {
  formatarAltura,
  formatarData,
  obterRotuloStatus,
} from "@/lib/formatadores";
import {
  coordenadasIntervencaoValidas,
  obterProximoStatusIntervencao,
  ordenarIntervencoesCampo,
  ROTULOS_STATUS_INTERVENCAO,
} from "@/lib/intervencoes";
import type { Intervencao, StatusIntervencao } from "@/types/intervencao";

type FiltroCampo = "abertas" | StatusIntervencao;

interface PropriedadesCampoOperacional {
  intervencoesIniciais: Intervencao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

function DetalhesCampo({
  intervencao,
  id,
}: {
  intervencao: Intervencao;
  id: string;
}) {
  const itens = [
    ["Dispositivo", intervencao.dispositivoId],
    ["Estado da leitura", obterRotuloStatus(intervencao.statusLeitura)],
    ["Criada em", formatarData(intervencao.criadaEm)],
    ["Iniciada em", intervencao.iniciadaEm ? formatarData(intervencao.iniciadaEm) : null],
    ["Concluída em", intervencao.concluidaEm ? formatarData(intervencao.concluidaEm) : null],
    [
      "Coordenadas",
      coordenadasIntervencaoValidas(intervencao)
        ? `${intervencao.latitude}, ${intervencao.longitude}`
        : null,
    ],
  ].filter((item): item is [string, string] => item[1] !== null);

  return (
    <div className="detalhes-campo" id={id}>
      <h3>Detalhes da intervenção</h3>
      <dl>
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DestinoCampo({ intervencao }: { intervencao: Intervencao }) {
  const possuiLocalizacao = Boolean(
    intervencao.rodovia || intervencao.km || intervencao.sentido || intervencao.trecho,
  );

  if (!possuiLocalizacao) {
    return (
      <div className="destino-campo destino-ausente">
        <span aria-hidden="true">⌖</span>
        <strong>Localização operacional não cadastrada.</strong>
      </div>
    );
  }

  return (
    <div className="destino-campo">
      <span className="icone-destino-campo" aria-hidden="true">⌖</span>
      <div>
        {intervencao.rodovia ? <strong>{intervencao.rodovia}</strong> : null}
        <div className="referencias-destino-campo">
          {intervencao.km ? <span>Km {intervencao.km}</span> : null}
          {intervencao.sentido ? <span>Sentido {intervencao.sentido}</span> : null}
        </div>
        {intervencao.trecho ? <p>{intervencao.trecho}</p> : null}
      </div>
    </div>
  );
}

function CardServicoCampo({
  intervencao,
  expandida,
  processando,
  bloqueado,
  aoAlternarDetalhes,
  aoAlterarStatus,
}: {
  intervencao: Intervencao;
  expandida: boolean;
  processando: boolean;
  bloqueado: boolean;
  aoAlternarDetalhes: (id: string) => void;
  aoAlterarStatus: (intervencao: Intervencao, status: StatusIntervencao) => void;
}) {
  const proximoStatus = obterProximoStatusIntervencao(intervencao.status);
  const concluida = intervencao.status === "concluida";
  const idDetalhes = `detalhes-campo-${intervencao.id}`;

  return (
    <article className={`card-servico-campo prioridade-${intervencao.prioridade}`}>
      <header className="topo-servico-campo">
        <div>
          <span className="prioridade-campo">Prioridade {intervencao.prioridade}</span>
          <h2>Intervenção #{intervencao.id}</h2>
        </div>
        <span className={`estado-servico-campo status-${intervencao.status}`}>
          {concluida ? "✓ " : ""}{ROTULOS_STATUS_INTERVENCAO[intervencao.status]}
        </span>
      </header>

      <div className="deteccao-campo">
        <div>
          <span>Vegetação detectada</span>
          <strong>{formatarAltura(intervencao.alturaCm)}</strong>
        </div>
        <div>
          <span>Detectado em</span>
          <time dateTime={intervencao.medidoEm}>{formatarData(intervencao.medidoEm)}</time>
        </div>
      </div>

      <DestinoCampo intervencao={intervencao} />

      {expandida ? <DetalhesCampo intervencao={intervencao} id={idDetalhes} /> : null}

      <div className="acoes-servico-campo">
        <button
          className="botao-detalhes-campo"
          type="button"
          aria-expanded={expandida}
          aria-controls={idDetalhes}
          onClick={() => aoAlternarDetalhes(intervencao.id)}
        >
          {expandida ? "Ocultar detalhes" : "Ver detalhes"}
        </button>
        {coordenadasIntervencaoValidas(intervencao) ? (
          <Link href="/mapa">Ver no mapa</Link>
        ) : null}
        {proximoStatus ? (
          <button
            className="acao-principal-campo"
            type="button"
            disabled={bloqueado}
            onClick={() => aoAlterarStatus(intervencao, proximoStatus)}
          >
            {processando
              ? "Processando…"
              : proximoStatus === "em_atendimento"
                ? "Iniciar atendimento"
                : "Concluir intervenção"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function CampoOperacional({
  intervencoesIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesCampoOperacional) {
  const [intervencoes, setIntervencoes] = useState(() =>
    ordenarIntervencoesCampo(intervencoesIniciais),
  );
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erro, setErro] = useState(erroInicial);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroCampo>("abertas");
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set());
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
  const quantidadeAbertas = totais.pendentes + totais.emAtendimento;
  const intervencoesFiltradas = intervencoes.filter((intervencao) =>
    filtro === "abertas" ? intervencao.status !== "concluida" : intervencao.status === filtro,
  );
  const cargaInicialFalhou = sincronizadoEm === null && erro !== null;

  async function atualizarServicos() {
    if (atualizacaoEmAndamento.current || acaoEmAndamento.current) return;

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErro(null);
    setSucesso(null);

    try {
      const resultado = await atualizarIntervencoesAcao();
      setIntervencoes(ordenarIntervencoesCampo(resultado.intervencoes));
      setSincronizadoEm(resultado.sincronizadoEm);
    } catch {
      setErro("Não foi possível atualizar os serviços. Tente novamente.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  function alternarDetalhes(id: string) {
    setExpandidas((atuais) => {
      const proximas = new Set(atuais);
      if (proximas.has(id)) proximas.delete(id);
      else proximas.add(id);
      return proximas;
    });
  }

  async function alterarStatus(
    intervencao: Intervencao,
    novoStatus: StatusIntervencao,
  ) {
    if (acaoEmAndamento.current || atualizacaoEmAndamento.current) return;

    const mensagem =
      novoStatus === "em_atendimento"
        ? "Iniciar atendimento desta intervenção?"
        : "Confirmar conclusão desta intervenção?";
    if (!window.confirm(mensagem)) return;

    acaoEmAndamento.current = true;
    setProcessandoId(intervencao.id);
    setErro(null);
    setSucesso(null);

    try {
      const resultado = await atualizarStatusIntervencaoAcao(
        intervencao.id,
        novoStatus,
      );
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }

      setIntervencoes((atuais) =>
        ordenarIntervencoesCampo(
          atuais.map((item) =>
            item.id === intervencao.id ? resultado.intervencao : item,
          ),
        ),
      );
      setSucesso(
        novoStatus === "em_atendimento"
          ? `Atendimento da intervenção #${intervencao.id} iniciado.`
          : `Intervenção #${intervencao.id} concluída.`,
      );
      setSincronizadoEm(new Date().toISOString());
    } catch {
      setErro("A ação não pôde ser concluída. Tente novamente.");
    } finally {
      acaoEmAndamento.current = false;
      setProcessandoId(null);
    }
  }

  return (
    <div
      className="dashboard-interativo campo-operacional"
      aria-busy={atualizando || processandoId !== null}
    >
      <CabecalhoPaginaDados
        rotulo="Operação em campo"
        titulo="Serviços em campo"
        descricao="Consulte os serviços disponíveis e registre o andamento da intervenção."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarServicos}
      />

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar os serviços</h2>
          <p>Verifique a conexão e tente novamente.</p>
          <button
            className="botao-tentar-novamente"
            type="button"
            disabled={atualizando}
            onClick={atualizarServicos}
          >
            {atualizando ? "Atualizando…" : "Tentar novamente"}
          </button>
        </section>
      ) : (
        <>
          {erro ? <div className="aviso-campo erro" role="alert">{erro}</div> : null}
          {sucesso ? <div className="aviso-campo sucesso" role="status">{sucesso}</div> : null}

          <section className="resumo-campo" aria-label="Resumo dos serviços em campo">
            <div className="total-abertas-campo">
              <strong>{quantidadeAbertas}</strong>
              <span>{quantidadeAbertas === 1 ? "serviço aberto" : "serviços abertos"}</span>
            </div>
            <dl>
              <div><dt>Pendentes</dt><dd>{totais.pendentes}</dd></div>
              <div><dt>Em atendimento</dt><dd>{totais.emAtendimento}</dd></div>
            </dl>
          </section>

          <nav className="filtros-campo" aria-label="Filtrar serviços em campo">
            {[
              ["abertas", "Abertas"],
              ["em_atendimento", "Em atendimento"],
              ["pendente", "Pendentes"],
              ["concluida", `Concluídas (${totais.concluidas})`],
            ].map(([valor, rotulo]) => (
              <button
                type="button"
                key={valor}
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor as FiltroCampo)}
              >
                {rotulo}
              </button>
            ))}
          </nav>

          {intervencoes.length === 0 ? (
            <section className="estado-campo-vazio">
              <span className="estado-icone" aria-hidden="true">✓</span>
              <h2>Nenhum serviço disponível.</h2>
              <p>As intervenções criadas pelo centro de operações aparecerão aqui.</p>
              <Link href="/intervencoes">Voltar para intervenções</Link>
            </section>
          ) : intervencoesFiltradas.length === 0 ? (
            <section className="estado-campo-vazio">
              <h2>{filtro === "abertas" ? "Nenhuma intervenção aberta." : "Nenhum serviço neste filtro."}</h2>
              <p>
                {filtro === "abertas" && totais.concluidas > 0
                  ? "Todos os serviços registrados já foram concluídos."
                  : "Selecione outra situação para consultar os serviços."}
              </p>
            </section>
          ) : (
            <section className="lista-servicos-campo" aria-label="Intervenções disponíveis">
              {intervencoesFiltradas.map((intervencao) => (
                <CardServicoCampo
                  key={intervencao.id}
                  intervencao={intervencao}
                  expandida={expandidas.has(intervencao.id)}
                  processando={processandoId === intervencao.id}
                  bloqueado={processandoId !== null || atualizando}
                  aoAlternarDetalhes={alternarDetalhes}
                  aoAlterarStatus={alterarStatus}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
