"use client";

import { useEffect, useRef, useState } from "react";

import { IndicadorStatus } from "@/components/indicador-status";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import type { LeituraVegetacao } from "@/types/leitura";

type Visualizacao = "original" | "analise";

interface VisualizadorLeituraProps {
  leitura: LeituraVegetacao | null;
}

export function VisualizadorLeitura({ leitura }: VisualizadorLeituraProps) {
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("original");
  const [imagensComErro, setImagensComErro] = useState<Set<Visualizacao>>(
    new Set(),
  );
  const abaOriginal = useRef<HTMLButtonElement>(null);
  const abaAnalise = useRef<HTMLButtonElement>(null);
  const elementoImagem = useRef<HTMLImageElement>(null);
  const exibindoAnalise = visualizacao === "analise";
  const imagemSelecionada = exibindoAnalise
    ? leitura?.imagemDiagnosticoUrl
    : leitura?.imagemUrl;
  const imagemDisponivel = Boolean(
    imagemSelecionada && !imagensComErro.has(visualizacao),
  );

  useEffect(() => {
    setImagensComErro(new Set());
  }, [leitura?.id, leitura?.imagemUrl, leitura?.imagemDiagnosticoUrl]);

  useEffect(() => {
    const imagem = elementoImagem.current;

    if (imagem?.complete && imagem.naturalWidth === 0) {
      setImagensComErro((atuais) => new Set(atuais).add(visualizacao));
    }
  }, [imagemSelecionada, visualizacao]);

  function registrarErroImagem() {
    setImagensComErro((atuais) => new Set(atuais).add(visualizacao));
  }

  function navegarEntreAbas(evento: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key)) {
      return;
    }

    evento.preventDefault();
    const proximaVisualizacao =
      evento.key === "ArrowLeft" || evento.key === "Home"
        ? "original"
        : "analise";

    setVisualizacao(proximaVisualizacao);
    (proximaVisualizacao === "original" ? abaOriginal : abaAnalise).current?.focus();
  }

  return (
    <div className="visualizador-leitura">
      {leitura ? (
        <dl className="captura-metadados" aria-label="Dados da captura exibida">
          <div>
            <dt>Dispositivo</dt>
            <dd>{leitura.dispositivoId}</dd>
          </div>
          <div>
            <dt>Data e hora</dt>
            <dd><time dateTime={leitura.medidoEm}>{formatarData(leitura.medidoEm)}</time></dd>
          </div>
          <div>
            <dt>Altura</dt>
            <dd>{formatarAltura(leitura.alturaCm)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd><IndicadorStatus status={leitura.status} compacto /></dd>
          </div>
        </dl>
      ) : null}

      <div
        className="seletor-visualizacao"
        role="tablist"
        aria-label="Imagem da leitura"
      >
        <button
          ref={abaOriginal}
          type="button"
          id="aba-imagem-original"
          role="tab"
          className={!exibindoAnalise ? "ativo" : undefined}
          aria-selected={!exibindoAnalise}
          aria-controls="painel-imagem-leitura"
          tabIndex={!exibindoAnalise ? 0 : -1}
          onClick={() => setVisualizacao("original")}
          onKeyDown={navegarEntreAbas}
        >
          Original
        </button>
        <button
          ref={abaAnalise}
          type="button"
          id="aba-imagem-analise"
          role="tab"
          className={exibindoAnalise ? "ativo" : undefined}
          aria-selected={exibindoAnalise}
          aria-controls="painel-imagem-leitura"
          tabIndex={exibindoAnalise ? 0 : -1}
          onClick={() => setVisualizacao("analise")}
          onKeyDown={navegarEntreAbas}
        >
          Análise da visão
        </button>
      </div>

      {imagemDisponivel ? (
        <div
          className="captura-imagem-container"
          id="painel-imagem-leitura"
          role="tabpanel"
          aria-labelledby={exibindoAnalise ? "aba-imagem-analise" : "aba-imagem-original"}
        >
          <img
            ref={elementoImagem}
            className="captura-imagem"
            src={imagemSelecionada ?? undefined}
            alt={
              exibindoAnalise
                ? `Análise da vegetação registrada pelo dispositivo ${leitura?.dispositivoId ?? "desconhecido"}`
                : `Vegetação registrada pelo dispositivo ${leitura?.dispositivoId ?? "desconhecido"}`
            }
            onError={registrarErroImagem}
          />
        </div>
      ) : (
        <div
          className="captura-placeholder"
          id="painel-imagem-leitura"
          role="tabpanel"
          aria-labelledby={exibindoAnalise ? "aba-imagem-analise" : "aba-imagem-original"}
          aria-live="polite"
        >
          <span className="captura-icone" aria-hidden="true">▣</span>
          <strong>
            {exibindoAnalise
              ? "Análise não disponível"
              : leitura
                ? "Imagem não disponível"
                : "Nenhuma leitura registrada"}
          </strong>
          <p>
            {exibindoAnalise
              ? "O diagnóstico visual não está disponível para esta leitura."
              : leitura
                ? "Esta leitura não possui uma imagem original disponível."
                : "Realize uma nova captura com o dispositivo para iniciar o monitoramento."}
          </p>
        </div>
      )}
    </div>
  );
}
