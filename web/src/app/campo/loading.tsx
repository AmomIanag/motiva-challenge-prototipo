export default function CarregandoCampo() {
  return (
    <div className="campo-operacional" aria-busy="true" aria-label="Carregando serviços em campo">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="esqueleto esqueleto-resumo-campo" />
      <div className="esqueleto esqueleto-filtros-campo" />
      <div className="esqueleto esqueleto-servico-campo" />
      <span className="texto-carregando">Carregando serviços disponíveis…</span>
    </div>
  );
}
