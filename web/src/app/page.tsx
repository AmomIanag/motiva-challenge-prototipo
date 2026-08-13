import { BarraLateral } from "@/components/barra-lateral";
import { CardMetrica } from "@/components/card-metrica";
import { HistoricoLeituras } from "@/components/historico-leituras";
import { IndicadorStatus } from "@/components/indicador-status";
import { carregarDadosDashboard } from "@/lib/api";
import {
  formatarAltura,
  formatarData,
  obterMensagemStatus,
} from "@/lib/formatadores";
import type { LeituraVegetacao } from "@/types/leitura";

export const dynamic = "force-dynamic";

function CabecalhoDashboard() {
  return (
    <header className="cabecalho-dashboard">
      <div>
        <span className="rotulo-pagina">Centro de operações</span>
        <h1>Visão geral</h1>
        <p>Acompanhamento da vegetação na faixa de domínio rodoviário.</p>
      </div>
      <div className="selo-ambiente">
        <span aria-hidden="true" />
        Monitoramento ativo
      </div>
    </header>
  );
}

function EstadoSemLeituras() {
  return (
    <section className="estado-dashboard">
      <span className="estado-icone" aria-hidden="true">◇</span>
      <h2>Nenhuma leitura disponível</h2>
      <p>Assim que a API registrar uma medição, ela aparecerá neste painel.</p>
    </section>
  );
}

function EstadoErro() {
  return (
    <section className="estado-dashboard estado-erro" role="alert">
      <span className="estado-icone" aria-hidden="true">!</span>
      <h2>Não foi possível carregar os dados</h2>
      <p>Confirme se o backend está em execução e atualize esta página.</p>
    </section>
  );
}

function ConteudoDashboard({
  leituras,
  ultimaLeitura,
}: {
  leituras: LeituraVegetacao[];
  ultimaLeitura: LeituraVegetacao;
}) {
  return (
    <>
      <section className="grade-metricas" aria-label="Indicadores atuais">
        <CardMetrica
          titulo="Altura atual"
          valor={formatarAltura(ultimaLeitura.alturaCm)}
          detalhe="Vegetação estimada"
          simbolo="↕"
        />
        <CardMetrica
          titulo="Status"
          valor={<IndicadorStatus status={ultimaLeitura.status} />}
          detalhe="Condição operacional"
          simbolo="◎"
        />
        <CardMetrica
          titulo="Dispositivo"
          valor={ultimaLeitura.dispositivoId}
          detalhe="Ponto monitorado"
          simbolo="◇"
        />
        <CardMetrica
          titulo="Última leitura"
          valor={formatarData(ultimaLeitura.medidoEm)}
          detalhe="Horário de Brasília"
          simbolo="◷"
        />
      </section>

      <section className="grade-operacional" aria-label="Resumo operacional">
        <article className="painel painel-condicao">
          <div className="painel-cabecalho">
            <div>
              <span className="rotulo-secao">Condição operacional</span>
              <h2>{obterMensagemStatus(ultimaLeitura.status)}</h2>
            </div>
            <IndicadorStatus status={ultimaLeitura.status} compacto />
          </div>

          <div className={`escala-risco nivel-${ultimaLeitura.status}`}>
            <div>
              <span />
              <small>Seguro</small>
            </div>
            <div>
              <span />
              <small>Cuidado</small>
            </div>
            <div>
              <span />
              <small>Perigo</small>
            </div>
          </div>

          <div className="resumo-condicao">
            <div>
              <span>Altura detectada</span>
              <strong>{formatarAltura(ultimaLeitura.alturaCm)}</strong>
            </div>
            <div>
              <span>Origem da leitura</span>
              <strong>{ultimaLeitura.dispositivoId}</strong>
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
          <div className="captura-placeholder">
            <span className="captura-icone" aria-hidden="true">▣</span>
            <strong>Imagem ainda não disponível</strong>
            <p>O registro fotográfico será integrado em uma etapa futura.</p>
          </div>
        </article>
      </section>

      <HistoricoLeituras leituras={leituras} />
    </>
  );
}

export default async function PaginaInicial() {
  let dados;

  try {
    dados = await carregarDadosDashboard();
  } catch (erro) {
    console.error("Falha ao carregar os dados do dashboard:", erro);

    return (
      <div className="estrutura-dashboard">
        <BarraLateral />
        <main className="conteudo-dashboard">
          <CabecalhoDashboard />
          <EstadoErro />
        </main>
      </div>
    );
  }

  return (
    <div className="estrutura-dashboard">
      <BarraLateral />
      <main className="conteudo-dashboard" id="visao-geral">
        <CabecalhoDashboard />
        {dados.leituras.length === 0 || !dados.ultimaLeitura ? (
          <EstadoSemLeituras />
        ) : (
          <ConteudoDashboard
            leituras={dados.leituras}
            ultimaLeitura={dados.ultimaLeitura}
          />
        )}
      </main>
    </div>
  );
}
