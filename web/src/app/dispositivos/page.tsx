import type { Metadata } from "next";

import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export const metadata: Metadata = { title: "Dispositivos" };

export default function PaginaDispositivos() {
  return (
    <PaginaPlaceholder
      titulo="Dispositivos"
      descricao="Organização dos dispositivos utilizados no protótipo."
      simbolo="◇"
    />
  );
}
