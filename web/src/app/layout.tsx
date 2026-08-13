import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Visão Geral | Monitoramento Motiva",
  description: "Dashboard de monitoramento de vegetação rodoviária.",
};

type PropriedadesLayoutRaiz = Readonly<{
  children: ReactNode;
}>;

export default function LayoutRaiz({
  children: conteudo,
}: PropriedadesLayoutRaiz) {
  return (
    <html lang="pt-BR">
      <body>{conteudo}</body>
    </html>
  );
}
