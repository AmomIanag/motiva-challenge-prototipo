export default function CarregandoDashboard() {
  return (
    <div aria-busy="true" aria-label="Carregando dados do dashboard">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="grade-metricas">
        {Array.from({ length: 4 }, (_, indice) => (
          <div className="card-metrica esqueleto-card" key={indice} />
        ))}
      </div>
      <div className="esqueleto esqueleto-painel" />
      <span className="texto-carregando">Carregando dados de monitoramento…</span>
    </div>
  );
}
