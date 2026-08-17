import { BarraLateral } from "@/components/barra-lateral";
import { ControleTema } from "@/components/controle-tema";
import { DashboardInterativo } from "@/components/dashboard-interativo";
import { carregarDadosDashboard, obterUrlImagem } from "@/lib/api";

export const dynamic = "force-dynamic";

function CabecalhoDashboard() {
  return (
    <header className="cabecalho-dashboard">
      <div>
        <span className="rotulo-pagina">Centro de operações</span>
        <h1>Visão geral</h1>
        <p>Acompanhamento da vegetação na faixa de domínio rodoviário.</p>
      </div>
      <div className="acoes-cabecalho">
        <div className="selo-ambiente">
          <span aria-hidden="true" />
          Monitoramento ativo
        </div>
        <ControleTema />
      </div>
    </header>
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

export default async function PaginaInicial() {
  try {
    const dados = await carregarDadosDashboard();
    const leiturasComImagensAbsolutas = dados.leituras.map((leitura) => ({
      ...leitura,
      imagemUrl: leitura.imagemUrl
        ? obterUrlImagem(leitura.imagemUrl)
        : null,
      imagemDiagnosticoUrl: leitura.imagemDiagnosticoUrl
        ? obterUrlImagem(leitura.imagemDiagnosticoUrl)
        : null,
    }));

    return (
      <div className="estrutura-dashboard">
        <BarraLateral />
        <main className="conteudo-dashboard" id="visao-geral">
          <CabecalhoDashboard />
          <DashboardInterativo leiturasIniciais={leiturasComImagensAbsolutas} />
        </main>
      </div>
    );
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
}
