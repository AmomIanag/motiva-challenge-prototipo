export interface Dispositivo {
  dispositivoId: string;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
  origemLocalizacao: "manual" | "navegador" | null;
  localizacaoAtualizadaEm: string | null;
}
