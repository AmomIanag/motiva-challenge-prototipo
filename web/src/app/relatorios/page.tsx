import type { Metadata } from "next";

import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export const metadata: Metadata = { title: "Relatórios" };

export default function PaginaRelatorios() {
  return (
    <PaginaPlaceholder
      titulo="Relatórios"
      descricao="Consolidação dos dados para análise operacional."
      simbolo="▤"
    />
  );
}
