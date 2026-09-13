"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const itensNavegacao = [
  { rotulo: "Visão geral", simbolo: "▦", caminho: "/" },
  { rotulo: "Monitoramento", simbolo: "◎", caminho: "/monitoramento" },
  { rotulo: "Mapa", simbolo: "⌖", caminho: "/mapa" },
  { rotulo: "Alertas", simbolo: "!", caminho: "/alertas" },
  { rotulo: "Histórico", simbolo: "≡", caminho: "/historico" },
  { rotulo: "Dispositivos", simbolo: "◇", caminho: "/dispositivos" },
  { rotulo: "Relatórios", simbolo: "▤", caminho: "/relatorios" },
] as const;

export function NavegacaoLateral() {
  const caminhoAtual = usePathname();

  return (
    <nav className="navegacao" aria-label="Navegação principal">
      <p className="navegacao-titulo">Operação</p>
      <ul>
        {itensNavegacao.map((item) => {
          const ativo =
            item.caminho === "/"
              ? caminhoAtual === "/"
              : caminhoAtual === item.caminho ||
                caminhoAtual.startsWith(`${item.caminho}/`);

          return (
            <li key={item.caminho}>
              <Link
                href={item.caminho}
                className={`item-navegacao${ativo ? " ativo" : ""}`}
                aria-current={ativo ? "page" : undefined}
              >
                <span className="item-navegacao-icone" aria-hidden="true">
                  {item.simbolo}
                </span>
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
