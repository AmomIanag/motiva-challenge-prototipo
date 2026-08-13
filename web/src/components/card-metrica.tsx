import type { ReactNode } from "react";

interface PropriedadesCardMetrica {
  titulo: string;
  valor: ReactNode;
  detalhe: string;
  simbolo: string;
}

export function CardMetrica({
  titulo,
  valor,
  detalhe,
  simbolo,
}: PropriedadesCardMetrica) {
  return (
    <article className="card-metrica">
      <div className="card-metrica-topo">
        <span>{titulo}</span>
        <span className="card-metrica-icone" aria-hidden="true">
          {simbolo}
        </span>
      </div>
      <div className="card-metrica-valor">{valor}</div>
      <p>{detalhe}</p>
    </article>
  );
}

