import type { LeituraVegetacao, StatusVegetacao } from "@/types/leitura";

export type FiltroStatus = "todos" | StatusVegetacao;
export type FiltroPeriodo = "todo" | "hoje" | "7-dias" | "30-dias";

export interface FiltrosLeituras {
  status: FiltroStatus;
  dispositivoId: string;
  periodo: FiltroPeriodo;
}

export const TODOS_DISPOSITIVOS = "todos";
export const FUSO_HORARIO_APLICACAO = "America/Sao_Paulo";
export const FILTROS_PADRAO: FiltrosLeituras = {
  status: "todos",
  dispositivoId: TODOS_DISPOSITIVOS,
  periodo: "todo",
};

const formatadorPartesData = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO_APLICACAO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface PartesData {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

function obterPartesData(data: Date): PartesData {
  const partes = Object.fromEntries(
    formatadorPartesData
      .formatToParts(data)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, Number(parte.value)]),
  );

  return {
    ano: partes.year,
    mes: partes.month,
    dia: partes.day,
    hora: partes.hour,
    minuto: partes.minute,
    segundo: partes.second,
  };
}

function obterDeslocamentoFuso(data: Date): number {
  const partes = obterPartesData(data);
  const instanteComoUtc = Date.UTC(
    partes.ano,
    partes.mes - 1,
    partes.dia,
    partes.hora,
    partes.minuto,
    partes.segundo,
  );
  const instanteSemMilissegundos =
    Math.floor(data.getTime() / 1000) * 1000;
  return instanteComoUtc - instanteSemMilissegundos;
}

function converterInicioLocalParaInstante(
  ano: number,
  mes: number,
  dia: number,
): number {
  const alvoComoUtc = Date.UTC(ano, mes - 1, dia);
  let estimativa = alvoComoUtc;

  for (let tentativa = 0; tentativa < 2; tentativa += 1) {
    estimativa = alvoComoUtc - obterDeslocamentoFuso(new Date(estimativa));
  }

  return estimativa;
}

export function obterInicioPeriodo(
  periodo: FiltroPeriodo,
  agora: Date,
): number | null {
  if (periodo === "todo") {
    return null;
  }

  const partesHoje = obterPartesData(agora);
  const diasAnteriores = periodo === "hoje" ? 0 : periodo === "7-dias" ? 6 : 29;
  const dataAlvo = new Date(
    Date.UTC(partesHoje.ano, partesHoje.mes - 1, partesHoje.dia - diasAnteriores),
  );

  return converterInicioLocalParaInstante(
    dataAlvo.getUTCFullYear(),
    dataAlvo.getUTCMonth() + 1,
    dataAlvo.getUTCDate(),
  );
}

export function filtrosEstaoAtivos(filtros: FiltrosLeituras): boolean {
  return (
    filtros.status !== FILTROS_PADRAO.status ||
    filtros.dispositivoId !== FILTROS_PADRAO.dispositivoId ||
    filtros.periodo !== FILTROS_PADRAO.periodo
  );
}

export function filtrarLeituras(
  leituras: LeituraVegetacao[],
  filtros: FiltrosLeituras,
  agora = new Date(),
): LeituraVegetacao[] {
  const inicioPeriodo = obterInicioPeriodo(filtros.periodo, agora);
  const fimPeriodo = agora.getTime();

  return leituras.filter((leitura) => {
    if (filtros.status !== "todos" && leitura.status !== filtros.status) {
      return false;
    }
    if (
      filtros.dispositivoId !== TODOS_DISPOSITIVOS &&
      leitura.dispositivoId !== filtros.dispositivoId
    ) {
      return false;
    }
    if (inicioPeriodo !== null) {
      const instanteLeitura = new Date(leitura.medidoEm).getTime();
      if (
        !Number.isFinite(instanteLeitura) ||
        instanteLeitura < inicioPeriodo ||
        instanteLeitura > fimPeriodo
      ) {
        return false;
      }
    }
    return true;
  });
}
