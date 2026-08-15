import { Router } from "express";

import {
  ErroValidacaoImagem,
  removerImagem,
  salvarImagem,
  type ArquivoImagemSalvo,
} from "../imagens/armazenamento-imagem";
import {
  ErroProcessamentoVisao,
  processarImagem,
} from "../imagens/processar-imagem";
import { receberImagem } from "../imagens/receber-imagem";
import { DISPOSITIVO_PADRAO_PROTOTIPO } from "../../config/processamento-visao";
import { criarLeituraVegetacao } from "./leitura";
import {
  buscarLeituras,
  buscarUltimaLeitura,
  inserirLeitura,
} from "./repositorio-leituras";

export const roteadorLeituras = Router();

class ErroValidacaoDispositivo extends Error {}

function obterDispositivoId(valor: unknown): string {
  if (valor === undefined || valor === null || valor === "") {
    return DISPOSITIVO_PADRAO_PROTOTIPO;
  }

  if (typeof valor !== "string") {
    throw new ErroValidacaoDispositivo(
      "O dispositivoId deve ser informado como texto.",
    );
  }

  const dispositivoId = valor.trim();

  if (!dispositivoId) {
    return DISPOSITIVO_PADRAO_PROTOTIPO;
  }

  if (dispositivoId.length > 100) {
    throw new ErroValidacaoDispositivo(
      "O dispositivoId deve ter no máximo 100 caracteres.",
    );
  }

  return dispositivoId;
}

roteadorLeituras.post("/imagem", receberImagem, async (requisicao, resposta) => {
  const imagem = requisicao.file;
  let arquivoSalvo: ArquivoImagemSalvo | null = null;

  if (!imagem) {
    resposta.status(400).json({ erro: "Nenhuma imagem foi enviada." });
    return;
  }

  try {
    const dispositivoId = obterDispositivoId(requisicao.body.dispositivoId);
    arquivoSalvo = await salvarImagem(imagem);
    const medicao = await processarImagem(arquivoSalvo.caminhoAbsoluto);
    const leituraClassificada = criarLeituraVegetacao({
      dispositivoId,
      alturaCm: medicao.alturaCm,
      medidoEm: new Date().toISOString(),
    });
    const leitura = await inserirLeitura(
      leituraClassificada,
      arquivoSalvo.nome,
    );

    resposta.status(201).json({
      mensagem: "Imagem processada com sucesso.",
      leitura,
    });
  } catch (erro) {
    if (arquivoSalvo) {
      try {
        await removerImagem(arquivoSalvo.caminhoAbsoluto);
      } catch (erroRemocao) {
        console.error("Erro ao remover a imagem após a falha:", erroRemocao);
      }
    }

    if (erro instanceof ErroValidacaoDispositivo) {
      resposta.status(400).json({ erro: erro.message });
      return;
    }

    if (erro instanceof ErroValidacaoImagem) {
      resposta.status(415).json({ erro: erro.message });
      return;
    }

    if (erro instanceof ErroProcessamentoVisao) {
      console.error("Erro no processamento da visão computacional:", {
        tipo: erro.tipo,
        detalhes: erro.detalhes,
      });

      const status = erro.tipo === "processamento_falhou" ? 422 : 500;
      resposta.status(status).json({ erro: erro.message });
      return;
    }

    console.error("Erro ao processar e persistir a leitura:", erro);
    resposta.status(500).json({
      erro: "Não foi possível concluir o processamento da imagem.",
    });
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
