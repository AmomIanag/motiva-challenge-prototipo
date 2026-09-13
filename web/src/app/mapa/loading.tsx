export default function CarregandoMapa() {
  return (
    <div aria-busy="true" aria-label="Carregando configurações de localização">
      <div className="esqueleto esqueleto-cabecalho" />
      <div className="esqueleto esqueleto-painel esqueleto-localizacao" />
      <span className="texto-carregando">Carregando dispositivos…</span>
    </div>
  );
}
