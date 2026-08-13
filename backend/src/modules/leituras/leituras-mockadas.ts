import {
  criarLeituraVegetacao,
  type EntradaLeituraVegetacao,
  type LeituraVegetacao,
} from "./leitura";

const entradasLeiturasMockadas: EntradaLeituraVegetacao[] = [
  {
    dispositivoId: "ESP-01",
    alturaCm: 18.7,
    medidoEm: "2026-08-13T00:55:00-03:00",
  },
  {
    dispositivoId: "ESP-01",
    alturaCm: 31.4,
    medidoEm: "2026-08-13T00:57:00-03:00",
  },
  {
    dispositivoId: "ESP-01",
    alturaCm: 47.6,
    medidoEm: "2026-08-13T01:00:00-03:00",
  },
];

export const leiturasMockadas: LeituraVegetacao[] =
  entradasLeiturasMockadas.map(criarLeituraVegetacao);

