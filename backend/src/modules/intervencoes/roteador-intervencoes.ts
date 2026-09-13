import { Router, type Request, type Response } from "express";

import {
  STATUS_INTERVENCAO,
  type Intervencao,
  type ResultadoCriacaoIntervencao,
  type ResultadoTransicaoIntervencao,
  type StatusIntervencao,
} from "./intervencao";

export interface DependenciasIntervencoes {
  listarIntervencoes(): Promise<Intervencao[]>;
  criarIntervencao(leituraId: string): Promise<ResultadoCriacaoIntervencao>;
  atualizarStatusIntervencao(
    id: string,
    status: StatusIntervencao,
  ): Promise<ResultadoTransicaoIntervencao>;
}

const FORMATO_ID_BIGINT = /^[1-9]\d*$/;
const MAIOR_ID_BIGINT = 9_223_372_036_854_775_807n;

function idBigintValido(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    FORMATO_ID_BIGINT.test(valor) &&
    BigInt(valor) <= MAIOR_ID_BIGINT
  );
}

function corpoObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

export function criarRoteadorIntervencoes(
  dependencias: DependenciasIntervencoes,
): Router {
  const roteador = Router();

  roteador.get("/", async (_requisicao: Request, resposta: Response) => {
    try {
      resposta.status(200).json(await dependencias.listarIntervencoes());
    } catch (erro) {
      console.error("Erro ao listar intervenções:", erro);
      resposta.status(500).json({ erro: "Não foi possível listar as intervenções." });
    }
  });

  roteador.post("/", async (requisicao: Request, resposta: Response) => {
    if (!corpoObjeto(requisicao.body) || !idBigintValido(requisicao.body.leituraId)) {
      resposta.status(400).json({ erro: "O leituraId deve ser um ID BIGINT válido." });
      return;
    }

    try {
      const resultado = await dependencias.criarIntervencao(
        requisicao.body.leituraId,
      );

      if (resultado.tipo === "leitura_nao_encontrada") {
        resposta.status(404).json({ erro: "Leitura não encontrada." });
        return;
      }

      if (resultado.tipo === "leitura_segura") {
        resposta.status(409).json({
          erro: "Uma leitura em estado seguro não pode gerar intervenção.",
        });
        return;
      }

      if (resultado.tipo === "duplicada") {
        resposta.status(409).json({
          erro: "Já existe uma intervenção para esta leitura.",
        });
        return;
      }

      resposta.status(201).json({
        mensagem: "Intervenção criada com sucesso.",
        intervencao: resultado.intervencao,
      });
    } catch (erro) {
      console.error("Erro ao criar intervenção:", erro);
      resposta.status(500).json({ erro: "Não foi possível criar a intervenção." });
    }
  });

  roteador.patch(
    "/:id/status",
    async (requisicao: Request, resposta: Response) => {
      const id = requisicao.params.id;

      if (!idBigintValido(id)) {
        resposta.status(400).json({ erro: "O ID da intervenção é inválido." });
        return;
      }

      if (
        !corpoObjeto(requisicao.body) ||
        typeof requisicao.body.status !== "string" ||
        !STATUS_INTERVENCAO.includes(
          requisicao.body.status as StatusIntervencao,
        )
      ) {
        resposta.status(400).json({
          erro: "O status deve ser pendente, em_atendimento ou concluida.",
        });
        return;
      }

      try {
        const resultado = await dependencias.atualizarStatusIntervencao(
          id,
          requisicao.body.status as StatusIntervencao,
        );

        if (resultado.tipo === "nao_encontrada") {
          resposta.status(404).json({ erro: "Intervenção não encontrada." });
          return;
        }

        if (resultado.tipo === "transicao_invalida") {
          resposta.status(409).json({
            erro: `Não é permitido alterar uma intervenção ${resultado.statusAtual} para ${requisicao.body.status}.`,
          });
          return;
        }

        resposta.status(200).json({
          mensagem: "Status da intervenção atualizado com sucesso.",
          intervencao: resultado.intervencao,
        });
      } catch (erro) {
        console.error(`Erro ao atualizar a intervenção ${id}:`, erro);
        resposta.status(500).json({
          erro: "Não foi possível atualizar a intervenção.",
        });
      }
    },
  );

  return roteador;
}
