import { ControleTema } from "@/components/controle-tema";

interface PropriedadesPaginaPlaceholder {
  titulo: string;
  descricao: string;
  simbolo: string;
}

export function PaginaPlaceholder({
  titulo,
  descricao,
  simbolo,
}: PropriedadesPaginaPlaceholder) {
  return (
    <>
      <header className="cabecalho-dashboard cabecalho-pagina-placeholder">
        <div>
          <span className="rotulo-pagina">Plataforma Motiva</span>
          <h1>{titulo}</h1>
          <p>{descricao}</p>
        </div>
        <div className="acoes-cabecalho">
          <ControleTema />
        </div>
      </header>

      <section
        className="painel painel-placeholder"
        aria-label={`${titulo} em desenvolvimento`}
      >
        <span className="estado-icone" aria-hidden="true">{simbolo}</span>
        <h2>Funcionalidade em desenvolvimento</h2>
        <p>Este módulo será implementado em uma etapa futura.</p>
      </section>
    </>
  );
}
