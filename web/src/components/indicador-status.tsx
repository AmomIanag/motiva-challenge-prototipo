import { obterRotuloStatus } from "@/lib/formatadores";
import type { StatusVegetacao } from "@/types/leitura";

interface PropriedadesIndicadorStatus {
  status: StatusVegetacao;
  compacto?: boolean;
}

export function IndicadorStatus({
  status,
  compacto = false,
}: PropriedadesIndicadorStatus) {
  return (
    <span
      className={`indicador-status status-${status}${compacto ? " compacto" : ""}`}
    >
      <span className="indicador-status-ponto" aria-hidden="true" />
      {obterRotuloStatus(status)}
    </span>
  );
}

