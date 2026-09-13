export default function CarregandoIntervencoes() {
  return (
    <div aria-busy="true" aria-label="Carregando intervenções">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="grade-resumo-intervencoes">
        {Array.from({ length: 4 }, (_, indice) => (
          <div className="esqueleto esqueleto-resumo-intervencao" key={indice} />
        ))}
      </div>
      <div className="esqueleto esqueleto-painel esqueleto-lista-intervencoes" />
      <span className="texto-carregando">Carregando ações operacionais…</span>
    </div>
  );
}
