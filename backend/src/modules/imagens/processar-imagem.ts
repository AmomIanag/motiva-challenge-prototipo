import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

import { CONFIGURACAO_PROCESSAMENTO_VISAO } from "../../config/processamento-visao";

const executarArquivo = promisify(execFile);

export type TipoErroProcessamentoVisao =
  | "python_indisponivel"
  | "processamento_falhou"
  | "resultado_invalido";

export class ErroProcessamentoVisao extends Error {
  constructor(
    public readonly tipo: TipoErroProcessamentoVisao,
    mensagem: string,
    public readonly detalhes?: unknown,
  ) {
    super(mensagem);
  }
}

export interface ResultadoProcessamentoVisao {
  alturaCm: number;
  escalaPixelsPorCm: number;
}

function validarResultado(
  valor: unknown,
): valor is ResultadoProcessamentoVisao {
  if (!valor || typeof valor !== "object") {
    return false;
  }

  const resultado = valor as Record<string, unknown>;
  return (
    typeof resultado.alturaCm === "number" &&
    Number.isFinite(resultado.alturaCm) &&
    resultado.alturaCm >= 0 &&
    typeof resultado.escalaPixelsPorCm === "number" &&
    Number.isFinite(resultado.escalaPixelsPorCm) &&
    resultado.escalaPixelsPorCm > 0
  );
}

export async function processarImagem(
  caminhoImagem: string,
): Promise<ResultadoProcessamentoVisao> {
  try {
    await Promise.all([
      access(CONFIGURACAO_PROCESSAMENTO_VISAO.executavelPython),
      access(CONFIGURACAO_PROCESSAMENTO_VISAO.scriptMedicao),
    ]);
  } catch (erro) {
    throw new ErroProcessamentoVisao(
      "python_indisponivel",
      "O ambiente Python da visão computacional não está disponível.",
      erro,
    );
  }

  let saida: string;

  try {
    const resultadoProcesso = await executarArquivo(
      CONFIGURACAO_PROCESSAMENTO_VISAO.executavelPython,
      [
        CONFIGURACAO_PROCESSAMENTO_VISAO.scriptMedicao,
        "--imagem",
        caminhoImagem,
        "--formato-json",
        "--sem-diagnostico",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
        timeout: CONFIGURACAO_PROCESSAMENTO_VISAO.tempoLimiteMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
    );
    saida = resultadoProcesso.stdout.trim();
  } catch (erro) {
    throw new ErroProcessamentoVisao(
      "processamento_falhou",
      "Não foi possível medir a vegetação na imagem.",
      erro,
    );
  }

  try {
    const resultado = JSON.parse(saida) as unknown;

    if (!validarResultado(resultado)) {
      throw new Error("O JSON não contém uma medição válida.");
    }

    return resultado;
  } catch (erro) {
    throw new ErroProcessamentoVisao(
      "resultado_invalido",
      "O processamento retornou um resultado inválido.",
      erro,
    );
  }
}
