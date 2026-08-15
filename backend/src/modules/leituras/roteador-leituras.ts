import { Router } from "express";

import {
  ErroValidacaoImagem,
  salvarImagem,
} from "../imagens/armazenamento-imagem";
import { receberImagem } from "../imagens/receber-imagem";
import { buscarLeituras, buscarUltimaLeitura } from "./repositorio-leituras";

export const roteadorLeituras = Router();

roteadorLeituras.post("/imagem", receberImagem, async (requisicao, resposta) => {
  const imagem = requisicao.file;

  if (!imagem) {
    resposta.status(400).json({ erro: "Nenhuma imagem foi enviada." });
    return;
  }

  try {
    const arquivo = await salvarImagem(imagem);
    resposta.status(201).json({
      mensagem: "Imagem recebida com sucesso.",
      arquivo,
    });
  } catch (erro) {
    if (erro instanceof ErroValidacaoImagem) {
      resposta.status(415).json({ erro: erro.message });
      return;
    }

    console.error("Erro ao salvar a imagem:", erro);
    resposta.status(500).json({ erro: "Não foi possível salvar a imagem." });
  }
});

roteadorLeituras.get("/", async (_requisicao, resposta) => {
  try {
    const leituras = await buscarLeituras();
    resposta.status(200).json(leituras);
  } catch (erro) {
    console.error("Erro ao consultar as leituras:", erro);
    resposta.status(500).json({ erro: "Não foi possível consultar as leituras." });
  }
});

roteadorLeituras.get("/ultima", async (_requisicao, resposta) => {
  try {
    const ultimaLeitura = await buscarUltimaLeitura();

    if (!ultimaLeitura) {
      resposta
        .status(404)
        .json({ erro: "Nenhuma leitura de vegetação encontrada." });
      return;
    }

    resposta.status(200).json(ultimaLeitura);
  } catch (erro) {
    console.error("Erro ao consultar a última leitura:", erro);
    resposta
      .status(500)
      .json({ erro: "Não foi possível consultar a última leitura." });
  }
});
