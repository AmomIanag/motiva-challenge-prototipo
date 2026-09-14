export default function CarregandoDispositivos() {
  return (
    <div
      className="dispositivos-operacionais"
      aria-busy="true"
      aria-label="Carregando dispositivos"
    >
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="grade-resumo-dispositivos">
        {Array.from({ length: 4 }, (_, indice) => (
          <div className="esqueleto esqueleto-resumo-dispositivo" key={indice} />
        ))}
      </div>
      <div className="esqueleto esqueleto-card-dispositivo" />
      <span className="texto-carregando">Carregando pontos de monitoramento…</span>
    </div>
  );
}
