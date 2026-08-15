import express from "express";

import { verificarConexaoBancoDados } from "./config/banco-de-dados";
import { roteadorLeituras } from "./modules/leituras/roteador-leituras";

export const aplicacao = express();

aplicacao.get("/api/saude", async (_requisicao, resposta) => {
  try {
    await verificarConexaoBancoDados();
    resposta.status(200).json({ status: "ok" });
  } catch (erro) {
    console.error("Erro ao verificar a conexão com o PostgreSQL:", erro);
    resposta
      .status(503)
      .json({ status: "erro", erro: "Banco de dados indisponível." });
  }
});

aplicacao.use("/api/leituras", roteadorLeituras);
