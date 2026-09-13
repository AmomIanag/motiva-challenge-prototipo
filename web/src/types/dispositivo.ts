export type OrigemLocalizacao = "manual" | "navegador";

export interface Dispositivo {
  dispositivoId: string;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
  origemLocalizacao: OrigemLocalizacao | null;
  localizacaoAtualizadaEm: string | null;
}

export interface DadosLocalizacaoDispositivo {
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
  origemLocalizacao: OrigemLocalizacao | null;
}
