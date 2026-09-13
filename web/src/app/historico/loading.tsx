export default function CarregandoHistorico() {
  return (
    <div aria-busy="true" aria-label="Carregando histórico de leituras">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="painel esqueleto-card esqueleto-filtros-historico" />
      <div className="painel esqueleto-card esqueleto-lista-historico" />
      <span className="texto-carregando">Carregando histórico de leituras…</span>
    </div>
  );
}
