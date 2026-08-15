import { MarcaMotiva } from "@/components/marca-motiva";

const itensNavegacao = [
  { rotulo: "Visão Geral", simbolo: "▦", ativo: true },
  { rotulo: "Monitoramento", simbolo: "◎" },
  { rotulo: "Mapa", simbolo: "⌖" },
  { rotulo: "Alertas", simbolo: "!" },
  { rotulo: "Histórico", simbolo: "≡" },
  { rotulo: "Dispositivos", simbolo: "◇" },
  { rotulo: "Relatórios", simbolo: "▤" },
];

export function BarraLateral() {
  return (
    <aside className="barra-lateral">
      <div className="marca">
        <MarcaMotiva />
        <span className="marca-produto">Monitoramento viário</span>
      </div>

      <nav className="navegacao" aria-label="Navegação principal">
        <p className="navegacao-titulo">Operação</p>
        <ul>
          {itensNavegacao.map((item) => (
            <li key={item.rotulo}>
              <span
                className={`item-navegacao${item.ativo ? " ativo" : ""}`}
                aria-current={item.ativo ? "page" : undefined}
                aria-disabled={!item.ativo}
              >
                <span className="item-navegacao-icone" aria-hidden="true">
                  {item.simbolo}
                </span>
                {item.rotulo}
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="barra-lateral-rodape">
        <span className="indicador-conexao" aria-hidden="true" />
        <div>
          <strong>Ambiente de demonstração</strong>
          <span>Dados simulados</span>
        </div>
      </div>
    </aside>
  );
}
