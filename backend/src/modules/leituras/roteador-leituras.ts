import { Router } from "express";

import { leiturasMockadas } from "./leituras-mockadas";

export const roteadorLeituras = Router();

roteadorLeituras.get("/", (_requisicao, resposta) => {
  resposta.status(200).json(leiturasMockadas);
});

roteadorLeituras.get("/ultima", (_requisicao, resposta) => {
  const ultimaLeitura = leiturasMockadas.at(-1);

  if (!ultimaLeitura) {
    resposta.status(404).json({ erro: "Nenhuma leitura de vegetação encontrada." });
    return;
  }

  resposta.status(200).json(ultimaLeitura);
});

