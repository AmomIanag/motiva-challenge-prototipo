import { FUSO_HORARIO_APLICACAO } from "@/lib/filtros-leituras";

const PASSO_EIXO_Y_CM = 5;
const MAXIMO_MINIMO_EIXO_Y_CM = 50;
const INTERVALO_CURTO_MS = 10 * 60 * 1000;

const formatadorDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO_APLICACAO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatadorHorario = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_HORARIO_APLICACAO,
  hour: "2-digit",
  minute: "2-digit",
});

const formatadorHorarioComSegundos = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_HORARIO_APLICACAO,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const formatadorDataHoraCompacta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_HORARIO_APLICACAO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function calcularMaximoEixoY(maiorAlturaCm: number): number {
  const referencia = Math.max(40, maiorAlturaCm);
  const margemSuperior = Math.max(5, referencia * 0.08);
  const maximoArredondado =
    Math.ceil((referencia + margemSuperior) / PASSO_EIXO_Y_CM) *
    PASSO_EIXO_Y_CM;

  return Math.max(MAXIMO_MINIMO_EIXO_Y_CM, maximoArredondado);
}

export function calcularQuantidadeTicks(larguraDisponivel: number): number {
  if (larguraDisponivel < 480) return 2;
  if (larguraDisponivel < 768) return 3;
  if (larguraDisponivel < 1050) return 4;
  if (larguraDisponivel < 1350) return 5;
  return 6;
}

export function criarTicksTemporais(
  primeiroInstante: number,
  ultimoInstante: number,
  quantidadeMaxima: number,
): number[] {
  const intervalo = ultimoInstante - primeiroInstante;
  if (intervalo <= 0 || quantidadeMaxima <= 1) {
    return [primeiroInstante];
  }

  return [
    ...new Set(
      Array.from({ length: quantidadeMaxima }, (_, indice) =>
        Math.round(
          primeiroInstante +
            (intervalo * indice) / (quantidadeMaxima - 1),
        ),
      ),
    ),
  ];
}

export function estaoNoMesmoDia(
  primeiroInstante: number,
  ultimoInstante: number,
): boolean {
  return (
    formatadorDia.format(new Date(primeiroInstante)) ===
    formatadorDia.format(new Date(ultimoInstante))
  );
}

export function formatarTickTemporal(
  instante: number,
  mesmoDia: boolean,
  intervaloTotal: number,
): string {
  if (!mesmoDia) {
    return formatadorDataHoraCompacta.format(new Date(instante));
  }

  const formatador =
    intervaloTotal < INTERVALO_CURTO_MS
      ? formatadorHorarioComSegundos
      : formatadorHorario;
  return formatador.format(new Date(instante));
}
