import { existsSync } from "node:fs";
import { Router } from "express";

import {
  criarDestinoImagemDiagnostico,
  ErroValidacaoImagem,
  removerImagem,
  salvarImagem,
  type ArquivoImagemSalvo,
  type DestinoImagemDiagnostico,
} from "../imagens/armazenamento-imagem";
import {
  ErroProcessamentoVisao,
  processarImagem,
} from "../imagens/processar-imagem";
import { receberImagem } from "../imagens/receber-imagem";
import { devePreservarUploadsFalhos } from "../../config/diagnostico-visao";
import { DISPOSITIVO_PADRAO_PROTOTIPO } from "../../config/processamento-visao";
import { criarLeituraVegetacao } from "./leitura";
import { limparImagensAssociadas } from "./limpar-imagens-leituras";
import {
  buscarLeituras,
  buscarUltimaLeitura,
  excluirLeituraPorId,
  excluirTodasLeituras,
  inserirLeitura,
} from "./repositorio-leituras";
import { criarRoteadorExclusaoLeituras } from "./roteador-exclusao-leituras";

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
  let destinoDiagnostico: DestinoImagemDiagnostico | null = null;
  let persistenciaConcluida = false;

  if (!imagem) {
    resposta.status(400).json({ erro: "Nenhuma imagem foi enviada." });
    return;
  }

  try {
    const dispositivoId = obterDispositivoId(requisicao.body.dispositivoId);
    arquivoSalvo = await salvarImagem(imagem);
    destinoDiagnostico = criarDestinoImagemDiagnostico(arquivoSalvo.nome);
    const medicao = await processarImagem(
      arquivoSalvo.caminhoAbsoluto,
      destinoDiagnostico.caminhoAbsoluto,
    );
    const leituraClassificada = criarLeituraVegetacao({
      dispositivoId,
      alturaCm: medicao.alturaCm,
      medidoEm: new Date().toISOString(),
    });
    const leitura = await inserirLeitura(
      leituraClassificada,
      arquivoSalvo.nome,
      destinoDiagnostico.nome,
    );
    persistenciaConcluida = true;

    resposta.status(201).json({
      mensagem: "Imagem processada com sucesso.",
      leitura,
    });
  } catch (erro) {
    const preservarParaDiagnostico =
      erro instanceof ErroProcessamentoVisao && devePreservarUploadsFalhos();

    if (!persistenciaConcluida && !preservarParaDiagnostico) {
      const caminhosParaRemover = [
        arquivoSalvo?.caminhoAbsoluto,
        destinoDiagnostico?.caminhoAbsoluto,
      ].filter((caminho): caminho is string => Boolean(caminho));

      for (const caminho of caminhosParaRemover) {
        try {
          await removerImagem(caminho);
        } catch (erroRemocao) {
          console.error("Erro ao remover uma imagem após a falha:", erroRemocao);
        }
      }
    }

    if (preservarParaDiagnostico && arquivoSalvo) {
      console.warn("Visão computacional rejeitou a leitura.");
      console.warn("Imagem preservada para diagnóstico:");
      console.warn(arquivoSalvo.caminhoAbsoluto);
      if (
        destinoDiagnostico &&
        existsSync(destinoDiagnostico.caminhoAbsoluto)
      ) {
        console.warn("Diagnóstico parcial preservado:");
        console.warn(destinoDiagnostico.caminhoAbsoluto);
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

roteadorLeituras.use(
  criarRoteadorExclusaoLeituras({
    excluirLeituraPorId,
    excluirTodasLeituras,
    limparImagensAssociadas,
  }),
);
