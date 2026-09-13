export default function CarregandoMonitoramento() {
  return (
    <div aria-busy="true" aria-label="Carregando dados do monitoramento">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="grade-monitoramento-destaque">
        <div className="painel esqueleto-card esqueleto-situacao-monitoramento" />
        <div className="painel esqueleto-card esqueleto-captura-monitoramento" />
      </div>
      <div className="esqueleto esqueleto-painel" />
      <span className="texto-carregando">Carregando dados de monitoramento…</span>
    </div>
  );
}
