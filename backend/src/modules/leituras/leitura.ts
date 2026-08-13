import { LIMITES_ALTURA_VEGETACAO_CM } from "../../config/risco-vegetacao";

export type StatusVegetacao = "seguro" | "cuidado" | "perigo";

export interface LeituraVegetacao {
  dispositivoId: string;
  alturaCm: number;
  status: StatusVegetacao;
  medidoEm: string;
}

export type EntradaLeituraVegetacao = Omit<LeituraVegetacao, "status">;

export function classificarAlturaVegetacao(
  alturaCm: number,
): StatusVegetacao {
  if (alturaCm <= LIMITES_ALTURA_VEGETACAO_CM.maximoSeguro) {
    return "seguro";
  }

  if (alturaCm <= LIMITES_ALTURA_VEGETACAO_CM.maximoCuidado) {
    return "cuidado";
  }

  return "perigo";
}

export function criarLeituraVegetacao(
  entrada: EntradaLeituraVegetacao,
): LeituraVegetacao {
  return {
    ...entrada,
    status: classificarAlturaVegetacao(entrada.alturaCm),
  };
}

