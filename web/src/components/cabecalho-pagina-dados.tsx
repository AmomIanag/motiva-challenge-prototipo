"use client";

import { ControleTema } from "@/components/controle-tema";
import { formatarHorario } from "@/lib/formatadores";

interface PropriedadesCabecalhoPaginaDados {
  rotulo: string;
  titulo: string;
  descricao: string;
  sincronizadoEm: string | null;
  atualizando: boolean;
  aoAtualizar: () => void;
}

function IconeAtualizar({ atualizando }: { atualizando: boolean }) {
  return (
    <svg
      className={atualizando ? "icone-atualizar girando" : "icone-atualizar"}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.4 7.2A8 8 0 1 0 20 14h-2a6 6 0 1 1-1.2-4L14 12h7V5l-2.6 2.2Z" />
    </svg>
  );
}

export function CabecalhoPaginaDados({
  rotulo,
  titulo,
  descricao,
  sincronizadoEm,
  atualizando,
  aoAtualizar,
}: PropriedadesCabecalhoPaginaDados) {
  return (
    <header className="cabecalho-dashboard">
      <div>
        <span className="rotulo-pagina">{rotulo}</span>
        <h1>{titulo}</h1>
        <p>{descricao}</p>
      </div>
      <div className="acoes-cabecalho">
        <div className="estado-sincronizacao" role="status" aria-live="polite">
          <span className="selo-ambiente">
            <span aria-hidden="true">+</span>
            Plataforma integrada
          </span>
          <span className="horario-sincronizacao">
            {sincronizadoEm
              ? `Atualizado às ${formatarHorario(sincronizadoEm)}`
              : "Dados ainda não sincronizados"}
          </span>
        </div>
        <button
          type="button"
          className="botao-atualizar"
          disabled={atualizando}
          aria-label={atualizando ? "Atualizando dados" : "Atualizar dados da página"}
          onClick={aoAtualizar}
        >
          <IconeAtualizar atualizando={atualizando} />
          <span>{atualizando ? "Atualizando…" : "Atualizar"}</span>
        </button>
        <ControleTema />
      </div>
    </header>
  );
}
