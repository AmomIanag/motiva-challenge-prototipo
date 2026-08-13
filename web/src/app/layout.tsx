import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Monitoramento de Vegetação",
  description: "Plataforma acadêmica de monitoramento de vegetação rodoviária.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

