import type { StatusVegetacao } from "@/types/leitura";

export type PrioridadeIntervencao = "alta" | "moderada";
export type StatusIntervencao = "pendente" | "em_atendimento" | "concluida";

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
