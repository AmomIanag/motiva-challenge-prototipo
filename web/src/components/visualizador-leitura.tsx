"use client";

import { useState } from "react";

type Visualizacao = "original" | "analise";

interface VisualizadorLeituraProps {
  dispositivoId: string;
  imagemOriginalUrl: string | null;
  imagemAnaliseUrl: string | null;
}

export function VisualizadorLeitura({
  dispositivoId,
  imagemOriginalUrl,
  imagemAnaliseUrl,
}: VisualizadorLeituraProps) {
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("original");
  const exibindoAnalise = visualizacao === "analise";
  const imagemSelecionada = exibindoAnalise
    ? imagemAnaliseUrl
    : imagemOriginalUrl;

  return (
    <div className="visualizador-leitura">
      <div
        className="seletor-visualizacao"
        role="group"
        aria-label="Selecionar imagem da leitura"
      >
        <button
          type="button"
          className={!exibindoAnalise ? "ativo" : undefined}
          aria-pressed={!exibindoAnalise}
          onClick={() => setVisualizacao("original")}
        >
          Original
        </button>
        <button
          type="button"
          className={exibindoAnalise ? "ativo" : undefined}
          aria-pressed={exibindoAnalise}
          onClick={() => setVisualizacao("analise")}
        >
          Análise da visão
        </button>
      </div>

      {imagemSelecionada ? (
        <div className="captura-imagem-container" aria-live="polite">
          <img
            className="captura-imagem"
            src={imagemSelecionada}
            alt={
              exibindoAnalise
                ? `Análise da vegetação registrada pelo dispositivo ${dispositivoId}`
                : `Vegetação registrada pelo dispositivo ${dispositivoId}`
            }
          />
        </div>
      ) : (
        <div className="captura-placeholder" aria-live="polite">
          <span className="captura-icone" aria-hidden="true">▣</span>
          <strong>
            {exibindoAnalise
              ? "Análise não disponível"
              : "Imagem ainda não disponível"}
          </strong>
          <p>
            {exibindoAnalise
              ? "A análise da visão não está disponível para esta leitura."
              : "Esta leitura não possui um registro fotográfico associado."}
          </p>
        </div>
      )}
    </div>
  );
}
