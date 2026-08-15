import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  CONFIGURACAO_UPLOAD_IMAGEM,
  DIRETORIO_UPLOADS,
} from "../../config/upload-imagem";

type TipoMimePermitido =
  (typeof CONFIGURACAO_UPLOAD_IMAGEM.tiposMimePermitidos)[number];

interface FormatoImagem {
  tipoMime: TipoMimePermitido;
  extensao: "jpg" | "png";
}

export interface ArquivoImagemSalvo {
  nome: string;
  tipoMime: TipoMimePermitido;
  tamanhoBytes: number;
}

export class ErroValidacaoImagem extends Error {}

function detectarFormatoImagem(conteudo: Buffer): FormatoImagem | null {
  const assinaturaJpeg =
    conteudo.length >= 3 &&
    conteudo[0] === 0xff &&
    conteudo[1] === 0xd8 &&
    conteudo[2] === 0xff;

  if (assinaturaJpeg) {
    return { tipoMime: "image/jpeg", extensao: "jpg" };
  }

  const assinaturaPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (
    conteudo.length >= assinaturaPng.length &&
    conteudo.subarray(0, assinaturaPng.length).equals(assinaturaPng)
  ) {
    return { tipoMime: "image/png", extensao: "png" };
  }

  return null;
}

function validarImagem(arquivo: Express.Multer.File): FormatoImagem {
  const tipoMimePermitido =
    CONFIGURACAO_UPLOAD_IMAGEM.tiposMimePermitidos.includes(
      arquivo.mimetype as TipoMimePermitido,
    );

  if (!tipoMimePermitido) {
    throw new ErroValidacaoImagem(
      "Formato não suportado. Envie uma imagem JPEG ou PNG.",
    );
  }

  const formatoDetectado = detectarFormatoImagem(arquivo.buffer);

  if (!formatoDetectado || formatoDetectado.tipoMime !== arquivo.mimetype) {
    throw new ErroValidacaoImagem(
      "O conteúdo do arquivo não corresponde a uma imagem JPEG ou PNG válida.",
    );
  }

  return formatoDetectado;
}

export async function salvarImagem(
  arquivo: Express.Multer.File,
): Promise<ArquivoImagemSalvo> {
  const formato = validarImagem(arquivo);
  const nomeArquivo = `${Date.now()}-${randomUUID()}.${formato.extensao}`;
  const caminhoImagem = join(DIRETORIO_UPLOADS, nomeArquivo);

  await mkdir(DIRETORIO_UPLOADS, { recursive: true });
  await writeFile(caminhoImagem, arquivo.buffer, { flag: "wx" });

  return {
    nome: nomeArquivo,
    tipoMime: formato.tipoMime,
    tamanhoBytes: arquivo.size,
  };
}

