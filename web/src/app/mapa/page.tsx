import type { Metadata } from "next";

import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export const metadata: Metadata = { title: "Mapa" };

export default function PaginaMapa() {
  return (
    <PaginaPlaceholder
      titulo="Mapa"
      descricao="Visualização geográfica dos pontos monitorados."
      simbolo="⌖"
    />
  );
}
