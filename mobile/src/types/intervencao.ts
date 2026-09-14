export type StatusIntervencao = "pendente" | "em_atendimento" | "concluida";
export type PrioridadeIntervencao = "alta" | "moderada";

export interface Intervencao {
  id: string;
  leituraId: string;
  dispositivoId: string;
  alturaCm: number;
  statusLeitura: "cuidado" | "perigo";
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
