import {
  filtrarLeituras,
  FUSO_HORARIO_APLICACAO,
  obterInicioPeriodo,
  TODOS_DISPOSITIVOS,
  type FiltroPeriodo,
} from "@/lib/filtros-leituras";
import type { Dispositivo } from "@/types/dispositivo";
import type { Intervencao } from "@/types/intervencao";
import type { LeituraVegetacao, StatusVegetacao } from "@/types/leitura";

export interface FiltrosRelatorio {
  periodo: FiltroPeriodo;
  dispositivoId: string;
}

export interface IndicadoresLeituras {
  total: number;
  porStatus: Record<StatusVegetacao, number>;
  alturaMedia: number | null;
  maiorLeitura: LeituraVegetacao | null;
}

export interface IndicadoresIntervencoes {
  total: number;
  abertas: number;
  pendentes: number;
  emAtendimento: number;
  concluidas: number;
}

export const FILTROS_RELATORIO_PADRAO: FiltrosRelatorio = {
  periodo: "todo",
  dispositivoId: TODOS_DISPOSITIVOS,
};

export const ROTULOS_PERIODO: Record<FiltroPeriodo, string> = {
  todo: "Todo o período",
  hoje: "Hoje",
  "7-dias": "Últimos 7 dias",
  "30-dias": "Últimos 30 dias",
};

export function filtrarLeiturasRelatorio(
  leituras: LeituraVegetacao[],
  filtros: FiltrosRelatorio,
  agora = new Date(),
): LeituraVegetacao[] {
  return filtrarLeituras(
    leituras,
    { ...filtros, status: "todos" },
    agora,
  );
}

export function filtrarIntervencoesRelatorio(
  intervencoes: Intervencao[],
  filtros: FiltrosRelatorio,
  agora = new Date(),
): Intervencao[] {
  const inicioPeriodo = obterInicioPeriodo(filtros.periodo, agora);
  const fimPeriodo = agora.getTime();

  return intervencoes.filter((intervencao) => {
    if (
      filtros.dispositivoId !== TODOS_DISPOSITIVOS &&
      intervencao.dispositivoId !== filtros.dispositivoId
    ) {
      return false;
    }

    if (inicioPeriodo !== null) {
      // O período operacional de intervenções é definido exclusivamente por criadaEm.
      const criadaEm = Date.parse(intervencao.criadaEm);
      if (
        !Number.isFinite(criadaEm) ||
        criadaEm < inicioPeriodo ||
        criadaEm > fimPeriodo
      ) {
        return false;
      }
    }

    return true;
  });
}

export function calcularIndicadoresLeituras(
  leituras: LeituraVegetacao[],
): IndicadoresLeituras {
  const alturasValidas = leituras.filter((leitura) =>
    Number.isFinite(leitura.alturaCm),
  );
  const somaAlturas = alturasValidas.reduce(
    (total, leitura) => total + leitura.alturaCm,
    0,
  );
  const maiorLeitura = alturasValidas.reduce<LeituraVegetacao | null>(
    (maior, leitura) =>
      maior === null || leitura.alturaCm > maior.alturaCm ? leitura : maior,
    null,
  );

  return {
    total: leituras.length,
    porStatus: {
      seguro: leituras.filter(({ status }) => status === "seguro").length,
      cuidado: leituras.filter(({ status }) => status === "cuidado").length,
      perigo: leituras.filter(({ status }) => status === "perigo").length,
    },
    alturaMedia:
      alturasValidas.length > 0
        ? Math.round((somaAlturas / alturasValidas.length) * 100) / 100
        : null,
    maiorLeitura,
  };
}

export function calcularIndicadoresIntervencoes(
  intervencoes: Intervencao[],
): IndicadoresIntervencoes {
  const pendentes = intervencoes.filter(({ status }) => status === "pendente").length;
  const emAtendimento = intervencoes.filter(
    ({ status }) => status === "em_atendimento",
  ).length;
  const concluidas = intervencoes.filter(({ status }) => status === "concluida").length;

  return {
    total: intervencoes.length,
    abertas: pendentes + emAtendimento,
    pendentes,
    emAtendimento,
    concluidas,
  };
}

export function escaparCampoCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

function gerarCsv(
  colunas: string[],
  linhas: Array<Array<string | number | null>>,
): string {
  const conteudo = [
    colunas.map(escaparCampoCsv).join(","),
    ...linhas.map((linha) => linha.map(escaparCampoCsv).join(",")),
  ].join("\r\n");

  return `\uFEFF${conteudo}`;
}

export function gerarCsvLeituras(
  leituras: LeituraVegetacao[],
  dispositivos: Dispositivo[],
): string {
  const dispositivosPorId = new Map(
    dispositivos.map((dispositivo) => [dispositivo.dispositivoId, dispositivo]),
  );

  return gerarCsv(
    [
      "id",
      "dispositivoId",
      "alturaCm",
      "status",
      "medidoEm",
      "rodovia",
      "km",
      "sentido",
      "trecho",
      "latitude",
      "longitude",
    ],
    leituras.map((leitura) => {
      const dispositivo = dispositivosPorId.get(leitura.dispositivoId);
      return [
        leitura.id,
        leitura.dispositivoId,
        leitura.alturaCm,
        leitura.status,
        leitura.medidoEm,
        dispositivo?.rodovia ?? null,
        dispositivo?.km ?? null,
        dispositivo?.sentido ?? null,
        dispositivo?.trecho ?? null,
        dispositivo?.latitude ?? null,
        dispositivo?.longitude ?? null,
      ];
    }),
  );
}

export function gerarCsvIntervencoes(intervencoes: Intervencao[]): string {
  return gerarCsv(
    [
      "id",
      "leituraId",
      "dispositivoId",
      "alturaCm",
      "statusLeitura",
      "prioridade",
      "status",
      "medidoEm",
      "rodovia",
      "km",
      "sentido",
      "trecho",
      "latitude",
      "longitude",
      "criadaEm",
      "iniciadaEm",
      "concluidaEm",
    ],
    intervencoes.map((intervencao) => [
      intervencao.id,
      intervencao.leituraId,
      intervencao.dispositivoId,
      intervencao.alturaCm,
      intervencao.statusLeitura,
      intervencao.prioridade,
      intervencao.status,
      intervencao.medidoEm,
      intervencao.rodovia,
      intervencao.km,
      intervencao.sentido,
      intervencao.trecho,
      intervencao.latitude,
      intervencao.longitude,
      intervencao.criadaEm,
      intervencao.iniciadaEm,
      intervencao.concluidaEm,
    ]),
  );
}

export function nomeArquivoRelatorio(
  tipo: "leituras" | "intervencoes",
  agora = new Date(),
): string {
  const data = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO_APLICACAO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);

  return `motiva-${tipo}-${data}.csv`;
}
