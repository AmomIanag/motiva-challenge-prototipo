import type { Intervencao } from "@/types/intervencao";

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

type DadosCoordenadas = Pick<Intervencao, "latitude" | "longitude">;

export function obterCoordenadasValidas(dados: DadosCoordenadas): Coordenadas | null {
  const { latitude, longitude } = dados;

  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  return { latitude, longitude };
}

export function textoLocalizacao(valor: string | null): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}

export function formatarCoordenadas({ latitude, longitude }: Coordenadas): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
