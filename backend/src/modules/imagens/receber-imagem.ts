import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";

import {
  CONFIGURACAO_UPLOAD_IMAGEM,
  LIMITE_TAMANHO_IMAGEM_BYTES,
} from "../../config/upload-imagem";

const processarMultipart = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: LIMITE_TAMANHO_IMAGEM_BYTES,
    files: 1,
  },
}).single(CONFIGURACAO_UPLOAD_IMAGEM.campo);

export function receberImagem(
  requisicao: Request,
  resposta: Response,
  proximo: NextFunction,
) {
  processarMultipart(requisicao, resposta, (erro) => {
    if (!erro) {
      proximo();
      return;
    }

    if (erro instanceof MulterError) {
      if (erro.code === "LIMIT_FILE_SIZE") {
        resposta.status(413).json({
          erro: `A imagem excede o limite de ${CONFIGURACAO_UPLOAD_IMAGEM.limiteMegabytes} MB.`,
        });
        return;
      }

      if (
        erro.code === "LIMIT_UNEXPECTED_FILE" ||
        erro.code === "LIMIT_FILE_COUNT"
      ) {
        resposta.status(400).json({
          erro: `Envie um único arquivo no campo "${CONFIGURACAO_UPLOAD_IMAGEM.campo}".`,
        });
        return;
      }

      resposta.status(400).json({ erro: "Não foi possível processar o upload." });
      return;
    }

    console.error("Erro ao processar o upload da imagem:", erro);
    resposta.status(500).json({ erro: "Não foi possível receber a imagem." });
  });
}

