import { Router } from "express";

import { buscarLeituras, buscarUltimaLeitura } from "./repositorio-leituras";

export const roteadorLeituras = Router();

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
