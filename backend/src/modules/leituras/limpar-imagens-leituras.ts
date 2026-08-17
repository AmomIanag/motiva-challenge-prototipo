import { rm } from "node:fs/promises";

import { DIRETORIO_UPLOADS } from "../../config/upload-imagem";
import { resolverCaminhoSeguroUpload } from "../imagens/armazenamento-imagem";
import type { ArquivosAssociadosLeitura } from "./repositorio-leituras";

interface OpcoesLimpezaImagens {
  diretorioUploads?: string;
  removerArquivo?: (caminho: string) => Promise<void>;
  registrarAviso?: (...dados: unknown[]) => void;
}

export async function limparImagensAssociadas(
  leituras: ArquivosAssociadosLeitura[],
  opcoes: OpcoesLimpezaImagens = {},
): Promise<void> {
  const diretorioUploads = opcoes.diretorioUploads ?? DIRETORIO_UPLOADS;
  const removerArquivo =
    opcoes.removerArquivo ??
    ((caminho: string) => rm(caminho, { force: true }));
  const registrarAviso = opcoes.registrarAviso ?? console.warn;
  const nomesProcessados = new Set<string>();

  for (const leitura of leituras) {
    const nomes = [leitura.nomeImagem, leitura.nomeImagemDiagnostico];

    for (const nome of nomes) {
      if (!nome || nomesProcessados.has(nome)) {
        continue;
      }
      nomesProcessados.add(nome);

      const caminhoSeguro = resolverCaminhoSeguroUpload(
        nome,
        diretorioUploads,
      );

      if (!caminhoSeguro) {
        registrarAviso(
          `Arquivo associado à leitura ${leitura.id} ignorado por possuir caminho inseguro:`,
          nome,
        );
        continue;
      }

      try {
        await removerArquivo(caminhoSeguro);
      } catch (erro) {
        registrarAviso(
          `A leitura ${leitura.id} foi excluída, mas não foi possível remover o arquivo ${nome}:`,
          erro,
        );
      }
    }
  }
}
