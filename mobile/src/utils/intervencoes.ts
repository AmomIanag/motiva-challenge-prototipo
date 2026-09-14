import type { Intervencao, PrioridadeIntervencao, StatusIntervencao } from "@/types/intervencao";

export type FiltroIntervencao = "abertas" | StatusIntervencao;

export const ROTULOS_STATUS: Record<StatusIntervencao, string> = {
  pendente: "Pendente",
  em_atendimento: "Em atendimento",
  concluida: "Concluída",
};

export const ROTULOS_PRIORIDADE: Record<PrioridadeIntervencao, string> = {
  alta: "Prioridade alta",
  moderada: "Prioridade moderada",
};

const ordemStatus: Record<StatusIntervencao, number> = {
  em_atendimento: 0,
  pendente: 1,
  concluida: 2,
};

export function ordenarIntervencoes(intervencoes: Intervencao[]): Intervencao[] {
  return [...intervencoes].sort((a, b) => {
    const porStatus = ordemStatus[a.status] - ordemStatus[b.status];
    if (porStatus !== 0) return porStatus;

    const porPrioridade = Number(a.prioridade === "moderada") - Number(b.prioridade === "moderada");
    if (porPrioridade !== 0) return porPrioridade;

    const porData = Date.parse(a.criadaEm) - Date.parse(b.criadaEm);
    if (porData !== 0) return porData;

    return a.id.localeCompare(b.id, "pt-BR", { numeric: true });
  });
}

export function filtrarIntervencoes(
  intervencoes: Intervencao[],
  filtro: FiltroIntervencao,
): Intervencao[] {
  if (filtro === "abertas") {
    return intervencoes.filter(({ status }) => status !== "concluida");
  }

  return intervencoes.filter(({ status }) => status === filtro);
}

export function obterProximoStatus(status: StatusIntervencao): StatusIntervencao | null {
  if (status === "pendente") return "em_atendimento";
  if (status === "em_atendimento") return "concluida";
  return null;
}

export function formatarAltura(alturaCm: number): string {
  return `${alturaCm.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} cm`;
}

export function formatarDataHora(valor: string | null): string {
  if (!valor) return "Não registrado";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export function formatarLocalizacao(intervencao: Intervencao): string {
  const partes = [
    intervencao.rodovia,
    intervencao.km ? `Km ${intervencao.km}` : null,
    intervencao.sentido ? `Sentido ${intervencao.sentido}` : null,
    intervencao.trecho,
  ].filter((parte): parte is string => Boolean(parte));

  return partes.join(" · ") || "Localização operacional não cadastrada.";
}
