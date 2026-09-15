export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export interface DadosCoordenadas {
  latitude: number | null;
  longitude: number | null;
}

export interface DadosLocalizacao extends DadosCoordenadas {
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
}

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

export function formatarLocalizacaoOperacional(dados: DadosLocalizacao): string {
  const rodovia = textoLocalizacao(dados.rodovia);
  const km = textoLocalizacao(dados.km);
  const sentido = textoLocalizacao(dados.sentido);
  const trecho = textoLocalizacao(dados.trecho);
  const partes = [
    rodovia,
    km ? `Km ${km}` : null,
    sentido ? `Sentido ${sentido}` : null,
    trecho,
  ].filter((parte): parte is string => parte !== null);

  if (partes.length > 0) return partes.join(" · ");

  const coordenadas = obterCoordenadasValidas(dados);
  return coordenadas
    ? formatarCoordenadas(coordenadas)
    : "Localização operacional não cadastrada.";
}
