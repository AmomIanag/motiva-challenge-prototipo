import type { Metadata } from "next";

import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export const metadata: Metadata = { title: "Monitoramento" };

export default function PaginaMonitoramento() {
  return (
    <PaginaPlaceholder
      titulo="Monitoramento"
      descricao="Acompanhamento das leituras e das condições de vegetação."
      simbolo="◎"
    />
  );
}
