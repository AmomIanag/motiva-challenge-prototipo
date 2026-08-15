import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Visão Geral | Monitoramento Motiva",
  description: "Dashboard de monitoramento de vegetação rodoviária.",
};

const codigoInicializacaoTema = `
  (function () {
    try {
      var temaSalvo = localStorage.getItem("tema-motiva");
      var tema = temaSalvo === "claro" || temaSalvo === "escuro"
        ? temaSalvo
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
      document.documentElement.dataset.theme = tema;
      document.documentElement.style.colorScheme = tema === "escuro" ? "dark" : "light";
    } catch (erro) {
      document.documentElement.dataset.theme = "claro";
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

type PropriedadesLayoutRaiz = Readonly<{
  children: ReactNode;
}>;

export default function LayoutRaiz({
  children: conteudo,
}: PropriedadesLayoutRaiz) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: codigoInicializacaoTema }} />
      </head>
      <body>{conteudo}</body>
    </html>
  );
}
