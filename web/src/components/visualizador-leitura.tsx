"use client";

import { useState } from "react";

type Visualizacao = "original" | "analise";

interface VisualizadorLeituraProps {
  dispositivoId: string | null;
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
                ? `Análise da vegetação registrada pelo dispositivo ${dispositivoId ?? "desconhecido"}`
                : `Vegetação registrada pelo dispositivo ${dispositivoId ?? "desconhecido"}`
            }
          />
        </div>
      ) : (
        <div className="captura-placeholder" aria-live="polite">
          <span className="captura-icone" aria-hidden="true">▣</span>
          <strong>
            {exibindoAnalise
              ? "Análise não disponível"
              : dispositivoId
                ? "Imagem ainda não disponível"
                : "Nenhuma leitura registrada"}
          </strong>
          <p>
            {exibindoAnalise
              ? "A análise da visão não está disponível para esta leitura."
              : dispositivoId
                ? "Esta leitura não possui um registro fotográfico associado."
                : "Realize uma nova captura com o dispositivo para iniciar o monitoramento."}
          </p>
        </div>
      )}
    </div>
  );
}
