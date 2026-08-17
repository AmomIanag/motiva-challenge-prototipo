import { Router } from "express";

import type { ArquivosAssociadosLeitura } from "./repositorio-leituras";

export interface DependenciasExclusaoLeituras {
  excluirLeituraPorId: (
    id: string,
  ) => Promise<ArquivosAssociadosLeitura | null>;
  excluirTodasLeituras: () => Promise<ArquivosAssociadosLeitura[]>;
  limparImagensAssociadas: (
    leituras: ArquivosAssociadosLeitura[],
  ) => Promise<void>;
}

const FORMATO_ID_BIGINT = /^[1-9]\d*$/;
const MAIOR_ID_BIGINT = 9_223_372_036_854_775_807n;

function idLeituraValido(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    FORMATO_ID_BIGINT.test(valor) &&
    BigInt(valor) <= MAIOR_ID_BIGINT
  );
}

export function criarRoteadorExclusaoLeituras(
  dependencias: DependenciasExclusaoLeituras,
): Router {
  const roteador = Router();

  roteador.delete("/", async (_requisicao, resposta) => {
    try {
      const leiturasExcluidas = await dependencias.excluirTodasLeituras();
      await dependencias.limparImagensAssociadas(leiturasExcluidas);

      resposta.status(200).json({
        mensagem: "Histórico limpo com sucesso.",
        quantidadeLeiturasRemovidas: leiturasExcluidas.length,
      });
    } catch (erro) {
      console.error("Erro ao limpar o histórico de leituras:", erro);
      resposta.status(500).json({
        erro: "Não foi possível limpar o histórico de leituras.",
      });
    }
  });

  roteador.delete("/:id", async (requisicao, resposta) => {
    const id = requisicao.params.id;

    if (!idLeituraValido(id)) {
      resposta.status(400).json({ erro: "O ID da leitura é inválido." });
      return;
    }

    try {
      const leituraExcluida = await dependencias.excluirLeituraPorId(id);

      if (!leituraExcluida) {
        resposta.status(404).json({ erro: "Leitura não encontrada." });
        return;
      }

      await dependencias.limparImagensAssociadas([leituraExcluida]);
      resposta.status(200).json({
        mensagem: "Leitura excluída com sucesso.",
        leituraId: id,
      });
    } catch (erro) {
      console.error(`Erro ao excluir a leitura ${id}:`, erro);
      resposta.status(500).json({
        erro: "Não foi possível excluir a leitura.",
      });
    }
  });

  return roteador;
}
