import { BarraLateral } from "@/components/barra-lateral";

export default function CarregandoDashboard() {
  return (
    <div className="estrutura-dashboard">
      <BarraLateral />
      <main className="conteudo-dashboard" aria-busy="true">
        <div className="esqueleto esqueleto-cabecalho" />
        <div className="grade-metricas">
          {Array.from({ length: 4 }, (_, indice) => (
            <div className="card-metrica esqueleto-card" key={indice} />
          ))}
        </div>
        <div className="esqueleto esqueleto-painel" />
        <span className="texto-carregando">Carregando dados de monitoramento…</span>
      </main>
    </div>
  );
}

