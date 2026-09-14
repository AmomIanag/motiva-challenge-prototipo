"use client";

import { useMemo, useRef, useState } from "react";

import { atualizarRelatoriosAcao } from "@/app/acoes-relatorios";
import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import { TODOS_DISPOSITIVOS, type FiltroPeriodo } from "@/lib/filtros-leituras";
import {
  calcularIndicadoresIntervencoes,
  calcularIndicadoresLeituras,
  FILTROS_RELATORIO_PADRAO,
  filtrarIntervencoesRelatorio,
  filtrarLeiturasRelatorio,
  gerarCsvIntervencoes,
  gerarCsvLeituras,
  nomeArquivoRelatorio,
  ROTULOS_PERIODO,
  type FiltrosRelatorio,
} from "@/lib/relatorios";
import type { Dispositivo } from "@/types/dispositivo";
import type { Intervencao } from "@/types/intervencao";
import type { LeituraVegetacao, StatusVegetacao } from "@/types/leitura";

interface PropriedadesRelatoriosOperacionais {
  leiturasIniciais: LeituraVegetacao[];
  dispositivosIniciais: Dispositivo[];
  intervencoesIniciais: Intervencao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

const rotulosStatus: Record<StatusVegetacao, string> = {
  seguro: "Seguro",
  cuidado: "Cuidado",
  perigo: "Perigo",
};

function baixarCsv(conteudo: string, nomeArquivo: string) {
  const arquivo = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = endereco;
  link.download = nomeArquivo;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(endereco), 0);
}

function IndicadorRelatorio({
  rotulo,
  valor,
  detalhe,
  classe = "",
}: {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  classe?: string;
}) {
  return (
    <article className={`indicador-relatorio ${classe}`.trim()}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {detalhe ? <small>{detalhe}</small> : null}
    </article>
  );
}

function DistribuicaoStatus({
  total,
  porStatus,
}: {
  total: number;
  porStatus: Record<StatusVegetacao, number>;
}) {
  if (total === 0) {
    return (
      <div className="estado-distribuicao-vazio">
        <strong>Sem leituras no período selecionado</strong>
        <span>A distribuição será exibida quando houver registros compatíveis.</span>
      </div>
    );
  }

  return (
    <div className="distribuicao-status-relatorio">
      {(["seguro", "cuidado", "perigo"] as const).map((status) => {
        const quantidade = porStatus[status];
        const percentual = (quantidade / total) * 100;

        return (
          <div className={`linha-distribuicao status-${status}`} key={status}>
            <div>
              <span>{rotulosStatus[status]}</span>
              <strong>
                {quantidade} {quantidade === 1 ? "leitura" : "leituras"}
              </strong>
              <small>{percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small>
            </div>
            <div
              className="trilho-distribuicao"
              role="progressbar"
              aria-label={`${rotulosStatus[status]}: ${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percentual)}
            >
              <span style={{ width: `${percentual}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RelatoriosOperacionais({
  leiturasIniciais,
  dispositivosIniciais,
  intervencoesIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesRelatoriosOperacionais) {
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [dispositivos, setDispositivos] = useState(dispositivosIniciais);
  const [intervencoes, setIntervencoes] = useState(intervencoesIniciais);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erro, setErro] = useState(erroInicial);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(FILTROS_RELATORIO_PADRAO);
  const atualizacaoEmAndamento = useRef(false);

  const dispositivosDisponiveis = useMemo(() => {
    const identificadores = new Set(dispositivos.map(({ dispositivoId }) => dispositivoId));
    leituras.forEach(({ dispositivoId }) => identificadores.add(dispositivoId));
    intervencoes.forEach(({ dispositivoId }) => identificadores.add(dispositivoId));
    return [...identificadores].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [dispositivos, intervencoes, leituras]);

  const leiturasFiltradas = useMemo(
    () => filtrarLeiturasRelatorio(leituras, filtros),
    [filtros, leituras],
  );
  const intervencoesFiltradas = useMemo(
    () => filtrarIntervencoesRelatorio(intervencoes, filtros),
    [filtros, intervencoes],
  );
  const indicadoresLeituras = useMemo(
    () => calcularIndicadoresLeituras(leiturasFiltradas),
    [leiturasFiltradas],
  );
  const indicadoresIntervencoes = useMemo(
    () => calcularIndicadoresIntervencoes(intervencoesFiltradas),
    [intervencoesFiltradas],
  );
  const cargaInicialFalhou = sincronizadoEm === null && erro !== null;

  function alterarFiltro(campo: keyof FiltrosRelatorio, valor: string) {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
    setMensagem(null);
  }

  async function atualizarRelatorios() {
    if (atualizacaoEmAndamento.current) return;

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErro(null);
    setMensagem(null);

    try {
      const resultado = await atualizarRelatoriosAcao();
      setLeituras(resultado.leituras);
      setDispositivos(resultado.dispositivos);
      setIntervencoes(resultado.intervencoes);
      setSincronizadoEm(resultado.sincronizadoEm);
      setMensagem("Relatórios atualizados com os dados mais recentes.");

      const idsAtualizados = new Set([
        ...resultado.dispositivos.map(({ dispositivoId }) => dispositivoId),
        ...resultado.leituras.map(({ dispositivoId }) => dispositivoId),
        ...resultado.intervencoes.map(({ dispositivoId }) => dispositivoId),
      ]);
      setFiltros((atuais) =>
        atuais.dispositivoId === TODOS_DISPOSITIVOS || idsAtualizados.has(atuais.dispositivoId)
          ? atuais
          : { ...atuais, dispositivoId: TODOS_DISPOSITIVOS },
      );
    } catch {
      setErro("Não foi possível atualizar os relatórios. Os dados anteriores continuam visíveis.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  function exportarLeituras() {
    if (leiturasFiltradas.length === 0) return;
    baixarCsv(
      gerarCsvLeituras(leiturasFiltradas, dispositivos),
      nomeArquivoRelatorio("leituras"),
    );
  }

  function exportarIntervencoes() {
    if (intervencoesFiltradas.length === 0) return;
    baixarCsv(
      gerarCsvIntervencoes(intervencoesFiltradas),
      nomeArquivoRelatorio("intervencoes"),
    );
  }

  return (
    <div className="dashboard-interativo relatorios-operacionais" aria-busy={atualizando}>
      <CabecalhoPaginaDados
        rotulo="Análise operacional"
        titulo="Relatórios"
        descricao="Indicadores agregados e exportação dos dados coletados."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarRelatorios}
      />

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar os relatórios</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            type="button"
            className="botao-tentar-novamente"
            disabled={atualizando}
            onClick={atualizarRelatorios}
          >
            {atualizando ? "Tentando novamente…" : "Tentar novamente"}
          </button>
        </section>
      ) : (
        <>
          {erro ? <div className="aviso-relatorios erro" role="alert">{erro}</div> : null}
          {mensagem ? <div className="aviso-relatorios sucesso" role="status">{mensagem}</div> : null}

          <section className="painel filtros-relatorios" aria-labelledby="titulo-filtros-relatorios">
            <div>
              <span className="rotulo-secao">Recorte dos dados</span>
              <h2 id="titulo-filtros-relatorios">Filtros do relatório</h2>
              <p>Os indicadores e arquivos CSV refletem esta seleção.</p>
            </div>
            <div className="campos-filtros-relatorios">
              <label>
                <span>Período</span>
                <select
                  value={filtros.periodo}
                  onChange={(evento) => alterarFiltro("periodo", evento.target.value as FiltroPeriodo)}
                >
                  {(Object.entries(ROTULOS_PERIODO) as Array<[FiltroPeriodo, string]>).map(
                    ([valor, rotulo]) => <option value={valor} key={valor}>{rotulo}</option>,
                  )}
                </select>
              </label>
              <label>
                <span>Dispositivo</span>
                <select
                  value={filtros.dispositivoId}
                  onChange={(evento) => alterarFiltro("dispositivoId", evento.target.value)}
                >
                  <option value={TODOS_DISPOSITIVOS}>Todos os dispositivos</option>
                  {dispositivosDisponiveis.map((dispositivoId) => (
                    <option value={dispositivoId} key={dispositivoId}>{dispositivoId}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="secao-relatorio" aria-labelledby="titulo-indicadores-leituras">
            <div className="cabecalho-secao-relatorio">
              <div>
                <span className="rotulo-secao">Dados coletados</span>
                <h2 id="titulo-indicadores-leituras">Leituras</h2>
              </div>
              <span>{leiturasFiltradas.length} {leiturasFiltradas.length === 1 ? "registro" : "registros"}</span>
            </div>
            <div className="grade-indicadores-relatorios grade-leituras-relatorio">
              <IndicadorRelatorio rotulo="Total de leituras" valor={indicadoresLeituras.total} />
              <IndicadorRelatorio rotulo="Seguro" valor={indicadoresLeituras.porStatus.seguro} classe="status-seguro" />
              <IndicadorRelatorio rotulo="Cuidado" valor={indicadoresLeituras.porStatus.cuidado} classe="status-cuidado" />
              <IndicadorRelatorio rotulo="Perigo" valor={indicadoresLeituras.porStatus.perigo} classe="status-perigo" />
              <IndicadorRelatorio
                rotulo="Altura média"
                valor={indicadoresLeituras.alturaMedia === null ? "--" : formatarAltura(indicadoresLeituras.alturaMedia)}
                detalhe={indicadoresLeituras.alturaMedia === null ? "Sem alturas válidas" : undefined}
              />
              <IndicadorRelatorio
                rotulo="Maior altura"
                valor={indicadoresLeituras.maiorLeitura ? formatarAltura(indicadoresLeituras.maiorLeitura.alturaCm) : "--"}
                detalhe={
                  indicadoresLeituras.maiorLeitura
                    ? `${indicadoresLeituras.maiorLeitura.dispositivoId} · ${formatarData(indicadoresLeituras.maiorLeitura.medidoEm)}`
                    : "Sem alturas válidas"
                }
              />
            </div>
          </section>

          <section className="secao-relatorio" aria-labelledby="titulo-distribuicao-relatorio">
            <div className="cabecalho-secao-relatorio">
              <div>
                <span className="rotulo-secao">Composição</span>
                <h2 id="titulo-distribuicao-relatorio">Distribuição por status</h2>
              </div>
            </div>
            <DistribuicaoStatus
              total={indicadoresLeituras.total}
              porStatus={indicadoresLeituras.porStatus}
            />
          </section>

          <section className="secao-relatorio" aria-labelledby="titulo-indicadores-intervencoes">
            <div className="cabecalho-secao-relatorio">
              <div>
                <span className="rotulo-secao">Ações operacionais</span>
                <h2 id="titulo-indicadores-intervencoes">Intervenções</h2>
              </div>
              <span>Período aplicado sobre a data de criação</span>
            </div>
            <div className="grade-indicadores-relatorios grade-intervencoes-relatorio">
              <IndicadorRelatorio rotulo="Total" valor={indicadoresIntervencoes.total} />
              <IndicadorRelatorio rotulo="Abertas" valor={indicadoresIntervencoes.abertas} />
              <IndicadorRelatorio rotulo="Pendentes" valor={indicadoresIntervencoes.pendentes} />
              <IndicadorRelatorio rotulo="Em atendimento" valor={indicadoresIntervencoes.emAtendimento} />
              <IndicadorRelatorio rotulo="Concluídas" valor={indicadoresIntervencoes.concluidas} />
            </div>
          </section>

          <section className="painel exportacao-relatorios" aria-labelledby="titulo-exportacao-relatorios">
            <div>
              <span className="rotulo-secao">Dados filtrados</span>
              <h2 id="titulo-exportacao-relatorios">Exportação CSV</h2>
              <p>Arquivos em UTF-8 compatíveis com planilhas no Windows.</p>
            </div>
            <div className="acoes-exportacao-relatorios">
              <button type="button" disabled={leiturasFiltradas.length === 0} onClick={exportarLeituras}>
                Exportar leituras CSV
                <span>{leiturasFiltradas.length} {leiturasFiltradas.length === 1 ? "linha" : "linhas"}</span>
              </button>
              <button type="button" disabled={intervencoesFiltradas.length === 0} onClick={exportarIntervencoes}>
                Exportar intervenções CSV
                <span>{intervencoesFiltradas.length} {intervencoesFiltradas.length === 1 ? "linha" : "linhas"}</span>
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
