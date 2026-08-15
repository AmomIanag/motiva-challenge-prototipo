import { LIMITES_ALTURA_VEGETACAO_CM } from "../../config/risco-vegetacao";

export type StatusVegetacao = "seguro" | "cuidado" | "perigo";

export interface LeituraVegetacao {
  dispositivoId: string;
  alturaCm: number;
  status: StatusVegetacao;
  medidoEm: string;
  imagemUrl: string | null;
  imagemDiagnosticoUrl: string | null;
}

export type LeituraVegetacaoSemImagem = Omit<
  LeituraVegetacao,
  "imagemUrl" | "imagemDiagnosticoUrl"
>;

export type EntradaLeituraVegetacao = Omit<
  LeituraVegetacaoSemImagem,
  "status"
>;

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
): LeituraVegetacaoSemImagem {
  return {
    ...entrada,
    status: classificarAlturaVegetacao(entrada.alturaCm),
  };
}
