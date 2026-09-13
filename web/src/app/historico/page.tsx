import type { Metadata } from "next";

import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export const metadata: Metadata = { title: "Histórico" };

export default function PaginaHistorico() {
  return (
    <PaginaPlaceholder
      titulo="Histórico"
      descricao="Consulta dedicada aos registros de leitura da plataforma."
      simbolo="≡"
    />
  );
}
