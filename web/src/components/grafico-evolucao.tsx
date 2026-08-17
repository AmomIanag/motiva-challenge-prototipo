"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  formatarAltura,
  formatarData,
  obterRotuloStatus,
} from "@/lib/formatadores";
import {
  calcularMaximoEixoY,
  calcularQuantidadeTicks,
  criarTicksTemporais,
  estaoNoMesmoDia,
  formatarTickTemporal,
} from "@/lib/calculos-grafico";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesGraficoEvolucao {
  leituras: LeituraVegetacao[];
  existemLeiturasNoSistema: boolean;
}

interface PontoGrafico {
  leitura: LeituraVegetacao;
  x: number;
  y: number;
}

const LARGURA = 1000;
const ALTURA = 290;
const MARGEM = { superior: 18, direita: 78, inferior: 46, esquerda: 62 };
const LIMITE_SEGURO = 20;
const LIMITE_CUIDADO = 40;

export function GraficoEvolucao({
  leituras,
  existemLeiturasNoSistema,
}: PropriedadesGraficoEvolucao) {
  const container = useRef<HTMLDivElement>(null);
  const [larguraDisponivel, setLarguraDisponivel] = useState(LARGURA);
  const [pontoAtivoId, setPontoAtivoId] = useState<string | null>(null);

  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;

    const atualizarLargura = () => setLarguraDisponivel(elemento.clientWidth);
    atualizarLargura();
    const observador = new ResizeObserver(atualizarLargura);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const dados = useMemo(() => {
    const ordenadas = [...leituras].sort(
      (a, b) => new Date(a.medidoEm).getTime() - new Date(b.medidoEm).getTime(),
    );
    const maiorAltura = Math.max(
      ...ordenadas.map((leitura) => leitura.alturaCm),
      0,
    );
    const maximoEixoY = calcularMaximoEixoY(maiorAltura);
    const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
    const alturaUtil = ALTURA - MARGEM.superior - MARGEM.inferior;
    const primeiroInstante = ordenadas[0]
      ? new Date(ordenadas[0].medidoEm).getTime()
      : 0;
    const ultimoInstante = ordenadas.at(-1)
      ? new Date(ordenadas.at(-1)!.medidoEm).getTime()
      : primeiroInstante;
    const intervalo = ultimoInstante - primeiroInstante;
    const pontos: PontoGrafico[] = ordenadas.map((leitura) => {
      const instante = new Date(leitura.medidoEm).getTime();
      const proporcaoX =
        intervalo === 0 ? 0.5 : (instante - primeiroInstante) / intervalo;
      return {
        leitura,
        x: MARGEM.esquerda + proporcaoX * larguraUtil,
        y:
          MARGEM.superior +
          (1 - leitura.alturaCm / maximoEixoY) * alturaUtil,
      };
    });
    const ticks = criarTicksTemporais(
      primeiroInstante,
      ultimoInstante,
      calcularQuantidadeTicks(larguraDisponivel),
    );

    return {
      pontos,
      ticks,
      maximoEixoY,
      alturaUtil,
      primeiroInstante,
      intervalo,
      mesmoDia: estaoNoMesmoDia(primeiroInstante, ultimoInstante),
    };
  }, [leituras, larguraDisponivel]);

  if (dados.pontos.length === 0) {
    return (
      <div ref={container} className="estado-vazio-grafico">
        <strong>
          {existemLeiturasNoSistema
            ? "Nenhuma leitura encontrada para os filtros selecionados."
            : "Nenhuma leitura disponível para análise."}
        </strong>
        <p>
          {existemLeiturasNoSistema
            ? "Ajuste ou limpe os filtros para visualizar a evolução."
            : "O gráfico será exibido após a primeira captura do dispositivo."}
        </p>
      </div>
    );
  }

  const pontoAtivo = dados.pontos.find(
    (ponto) => ponto.leitura.id === pontoAtivoId,
  );
  const yParaAltura = (alturaCm: number) =>
    MARGEM.superior +
    (1 - alturaCm / dados.maximoEixoY) * dados.alturaUtil;
  const xParaInstante = (instante: number) =>
    dados.intervalo === 0
      ? MARGEM.esquerda +
        (LARGURA - MARGEM.esquerda - MARGEM.direita) / 2
      : MARGEM.esquerda +
        ((instante - dados.primeiroInstante) / dados.intervalo) *
          (LARGURA - MARGEM.esquerda - MARGEM.direita);
  const ySeguro = yParaAltura(LIMITE_SEGURO);
  const yCuidado = yParaAltura(LIMITE_CUIDADO);
  const baseGrafico = ALTURA - MARGEM.inferior;
  const xFinalGrafico = LARGURA - MARGEM.direita;
  const tooltipAbaixo = Boolean(
    pontoAtivo && pontoAtivo.y < MARGEM.superior + 70,
  );

  return (
    <div ref={container} className="grafico-container">
      <svg
        className="grafico-evolucao"
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={`Evolução da altura da vegetação em ${dados.pontos.length} leituras`}
      >
        <rect className="faixa-grafico faixa-perigo" x={MARGEM.esquerda} y={MARGEM.superior} width={xFinalGrafico - MARGEM.esquerda} height={Math.max(0, yCuidado - MARGEM.superior)} />
        <rect className="faixa-grafico faixa-cuidado" x={MARGEM.esquerda} y={yCuidado} width={xFinalGrafico - MARGEM.esquerda} height={ySeguro - yCuidado} />
        <rect className="faixa-grafico faixa-seguro" x={MARGEM.esquerda} y={ySeguro} width={xFinalGrafico - MARGEM.esquerda} height={baseGrafico - ySeguro} />

        {[0, LIMITE_SEGURO, LIMITE_CUIDADO, dados.maximoEixoY].map((valor) => {
          const y = yParaAltura(valor);
          return (
            <g key={valor}>
              <line className={valor === LIMITE_SEGURO || valor === LIMITE_CUIDADO ? "linha-limite" : "linha-grade"} x1={MARGEM.esquerda} x2={xFinalGrafico} y1={y} y2={y} />
              <text className="rotulo-eixo-y" x={MARGEM.esquerda - 12} y={y + 4}>{valor} cm</text>
            </g>
          );
        })}

        <text className="rotulo-faixa rotulo-faixa-perigo" x={LARGURA - 12} y={(MARGEM.superior + yCuidado) / 2}>Perigo</text>
        <text className="rotulo-faixa rotulo-faixa-cuidado" x={LARGURA - 12} y={(yCuidado + ySeguro) / 2}>Cuidado</text>
        <text className="rotulo-faixa rotulo-faixa-seguro" x={LARGURA - 12} y={(ySeguro + baseGrafico) / 2}>Seguro</text>

        {dados.ticks.map((instante, indice) => {
          const x = xParaInstante(instante);
          const primeiro = indice === 0;
          const ultimo = indice === dados.ticks.length - 1;
          return (
            <g key={instante}>
              <line className="marca-eixo-x" x1={x} x2={x} y1={baseGrafico} y2={baseGrafico + 5} />
              <text
                className="rotulo-eixo-x"
                x={x}
                y={ALTURA - 16}
                textAnchor={primeiro ? "start" : ultimo ? "end" : "middle"}
              >
                {formatarTickTemporal(
                  instante,
                  dados.mesmoDia,
                  dados.intervalo,
                )}
              </text>
            </g>
          );
        })}

        {dados.pontos.length > 1 ? (
          <polyline
            className="linha-serie"
            points={dados.pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ")}
          />
        ) : null}

        {dados.pontos.map((ponto) => (
          <g
            key={ponto.leitura.id}
            className="ponto-interativo"
            tabIndex={0}
            role="button"
            aria-label={`${formatarAltura(ponto.leitura.alturaCm)}, ${obterRotuloStatus(ponto.leitura.status)}, dispositivo ${ponto.leitura.dispositivoId}, ${formatarData(ponto.leitura.medidoEm)}`}
            onMouseEnter={() => setPontoAtivoId(ponto.leitura.id)}
            onMouseLeave={() => setPontoAtivoId(null)}
            onFocus={() => setPontoAtivoId(ponto.leitura.id)}
            onBlur={() => setPontoAtivoId(null)}
          >
            <circle className="area-interacao-ponto" cx={ponto.x} cy={ponto.y} r={11} />
            <circle
              className={`ponto-serie ponto-${ponto.leitura.status}`}
              cx={ponto.x}
              cy={ponto.y}
              r={ponto.leitura.id === pontoAtivoId ? 7 : 5}
            />
          </g>
        ))}
      </svg>

      {pontoAtivo ? (
        <div
          className={`tooltip-grafico${tooltipAbaixo ? " tooltip-abaixo" : ""}`}
          role="status"
          style={{
            left: `${Math.min(88, Math.max(12, (pontoAtivo.x / LARGURA) * 100))}%`,
            top: `${Math.min(88, Math.max(7, (pontoAtivo.y / ALTURA) * 100))}%`,
          }}
        >
          <strong>{formatarAltura(pontoAtivo.leitura.alturaCm)}</strong>
          <span>{obterRotuloStatus(pontoAtivo.leitura.status)}</span>
          <span>{pontoAtivo.leitura.dispositivoId}</span>
          <time dateTime={pontoAtivo.leitura.medidoEm}>
            {formatarData(pontoAtivo.leitura.medidoEm)}
          </time>
        </div>
      ) : null}
    </div>
  );
}
