export type StatusVegetacao = "seguro" | "cuidado" | "perigo";

export interface LeituraVegetacao {
  id: string;
  dispositivoId: string;
  alturaCm: number;
  status: StatusVegetacao;
  medidoEm: string;
  imagemUrl: string | null;
  imagemDiagnosticoUrl: string | null;
}
