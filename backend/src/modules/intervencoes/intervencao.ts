import type { StatusVegetacao } from "../leituras/leitura";

export const STATUS_INTERVENCAO = [
  "pendente",
  "em_atendimento",
  "concluida",
] as const;

export type StatusIntervencao = (typeof STATUS_INTERVENCAO)[number];
export type PrioridadeIntervencao = "alta" | "moderada";

export interface Intervencao {
  id: string;
  leituraId: string | null;
  dispositivoId: string;
  alturaCm: number;
  statusLeitura: StatusVegetacao;
  medidoEm: string;
  prioridade: PrioridadeIntervencao;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
  status: StatusIntervencao;
  criadaEm: string;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  atualizadaEm: string;
}

export type ResultadoCriacaoIntervencao =
  | { tipo: "criada"; intervencao: Intervencao }
  | { tipo: "leitura_nao_encontrada" }
  | { tipo: "leitura_segura" }
  | { tipo: "duplicada" };

export type ResultadoTransicaoIntervencao =
  | { tipo: "atualizada"; intervencao: Intervencao }
  | { tipo: "nao_encontrada" }
  | { tipo: "transicao_invalida"; statusAtual: StatusIntervencao };

export function derivarPrioridadeIntervencao(
  status: StatusVegetacao,
): PrioridadeIntervencao | null {
  if (status === "perigo") return "alta";
  if (status === "cuidado") return "moderada";
  return null;
}

export function transicaoIntervencaoPermitida(
  statusAtual: StatusIntervencao,
  novoStatus: StatusIntervencao,
): boolean {
  return (
    (statusAtual === "pendente" && novoStatus === "em_atendimento") ||
    (statusAtual === "em_atendimento" && novoStatus === "concluida")
  );
}
