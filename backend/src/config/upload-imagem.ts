import { resolve } from "node:path";

export const CONFIGURACAO_UPLOAD_IMAGEM = {
  campo: "imagem",
  limiteMegabytes: 5,
  tiposMimePermitidos: ["image/jpeg", "image/png"],
} as const;

export const LIMITE_TAMANHO_IMAGEM_BYTES =
  CONFIGURACAO_UPLOAD_IMAGEM.limiteMegabytes * 1024 * 1024;

export const DIRETORIO_UPLOADS = resolve(__dirname, "../../uploads");

