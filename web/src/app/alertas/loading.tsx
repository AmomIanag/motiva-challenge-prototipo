export default function CarregandoAlertas() {
  return (
    <div aria-busy="true" aria-label="Carregando alertas">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="grade-resumo-alertas">
        {Array.from({ length: 3 }, (_, indice) => (
          <div className="esqueleto esqueleto-resumo-alerta" key={indice} />
        ))}
      </div>
      <div className="esqueleto esqueleto-painel esqueleto-lista-alertas" />
      <span className="texto-carregando">Carregando situações operacionais…</span>
    </div>
  );
}
