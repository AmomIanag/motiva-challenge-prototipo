export default function CarregandoRelatorios() {
  return (
    <div className="relatorios-operacionais" aria-busy="true" aria-label="Carregando relatórios">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="esqueleto esqueleto-filtros-relatorios" />
      <div className="grade-indicadores-relatorios">
        {Array.from({ length: 6 }, (_, indice) => (
          <div className="esqueleto esqueleto-indicador-relatorio" key={indice} />
        ))}
      </div>
      <span className="texto-carregando">Consolidando dados operacionais…</span>
    </div>
  );
}
