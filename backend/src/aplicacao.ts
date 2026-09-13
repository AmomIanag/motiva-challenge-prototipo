import express from "express";

import { verificarConexaoBancoDados } from "./config/banco-de-dados";
import { DIRETORIO_UPLOADS } from "./config/upload-imagem";
import {
  listarDispositivos,
  salvarLocalizacaoDispositivo,
} from "./modules/dispositivos/repositorio-dispositivos";
import { criarRoteadorDispositivos } from "./modules/dispositivos/roteador-dispositivos";
import {
  atualizarStatusIntervencao,
  criarIntervencao,
  listarIntervencoes,
} from "./modules/intervencoes/repositorio-intervencoes";
import { criarRoteadorIntervencoes } from "./modules/intervencoes/roteador-intervencoes";
import { roteadorLeituras } from "./modules/leituras/roteador-leituras";

export const aplicacao = express();

aplicacao.use(express.json({ limit: "16kb" }));

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
aplicacao.use(
  "/api/dispositivos",
  criarRoteadorDispositivos({
    listarDispositivos,
    salvarLocalizacaoDispositivo,
  }),
);
aplicacao.use(
  "/api/intervencoes",
  criarRoteadorIntervencoes({
    listarIntervencoes,
    criarIntervencao,
    atualizarStatusIntervencao,
  }),
);

aplicacao.use(
  "/uploads",
  express.static(DIRETORIO_UPLOADS, {
    dotfiles: "deny",
    fallthrough: true,
    index: false,
    setHeaders(resposta) {
      resposta.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

aplicacao.use("/uploads", (_requisicao, resposta) => {
  resposta.status(404).json({ erro: "Imagem não encontrada." });
});
