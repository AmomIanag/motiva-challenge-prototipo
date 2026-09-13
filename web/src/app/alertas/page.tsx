import type { Metadata } from "next";

import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export const metadata: Metadata = { title: "Alertas" };

export default function PaginaAlertas() {
  return (
    <PaginaPlaceholder
      titulo="Alertas"
      descricao="Consulta de condições que exigem acompanhamento operacional."
      simbolo="!"
    />
  );
}
