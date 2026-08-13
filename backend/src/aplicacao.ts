import express from "express";

import { roteadorLeituras } from "./modules/leituras/roteador-leituras";

export const aplicacao = express();

aplicacao.get("/api/saude", (_requisicao, resposta) => {
  resposta.status(200).json({ status: "ok" });
});

aplicacao.use("/api/leituras", roteadorLeituras);

