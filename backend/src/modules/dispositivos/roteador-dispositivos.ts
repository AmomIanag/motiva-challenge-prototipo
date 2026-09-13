import { Router, type Request, type Response } from "express";

import {
  ORIGENS_LOCALIZACAO,
  type DadosLocalizacaoDispositivo,
  type Dispositivo,
  type OrigemLocalizacao,
} from "./dispositivo";

interface DependenciasDispositivos {
  listarDispositivos(): Promise<Dispositivo[]>;
  salvarLocalizacaoDispositivo(
    dispositivoId: string,
    dados: DadosLocalizacaoDispositivo,
  ): Promise<Dispositivo>;
}

class ErroValidacao extends Error {}

function validarDispositivoId(valor: string | string[]): string {
  const dispositivoId = Array.isArray(valor) ? valor[0] : valor;
  const normalizado = dispositivoId.trim();

  if (normalizado.length === 0 || normalizado.length > 100) {
    throw new ErroValidacao(
      "O dispositivoId deve ter entre 1 e 100 caracteres.",
    );
  }

  return normalizado;
}

function normalizarTexto(
  corpo: Record<string, unknown>,
  campo: string,
  limite: number,
): string | null {
  const valor = corpo[campo];

  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor !== "string") {
    throw new ErroValidacao(`${campo} deve ser um texto ou nulo.`);
  }

  const normalizado = valor.trim();
  if (normalizado.length > limite) {
    throw new ErroValidacao(`${campo} deve ter no máximo ${limite} caracteres.`);
  }

  return normalizado || null;
}

function normalizarCoordenada(
  corpo: Record<string, unknown>,
  campo: "latitude" | "longitude",
  minimo: number,
  maximo: number,
): number | null {
  const valor = corpo[campo];

  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new ErroValidacao(`${campo} deve ser um número ou nulo.`);
  }

  if (valor < minimo || valor > maximo) {
    throw new ErroValidacao(
      `${campo} deve estar entre ${minimo} e ${maximo}.`,
    );
  }

  return valor;
}

function normalizarOrigem(
  corpo: Record<string, unknown>,
): OrigemLocalizacao | null {
  const valor = corpo.origemLocalizacao;

  if (valor === undefined || valor === null) {
    return null;
  }

  if (
    typeof valor !== "string" ||
    !ORIGENS_LOCALIZACAO.includes(valor as OrigemLocalizacao)
  ) {
    throw new ErroValidacao(
      "origemLocalizacao deve ser manual, navegador ou nulo.",
    );
  }

  return valor as OrigemLocalizacao;
}

function validarCorpo(corpoRecebido: unknown): DadosLocalizacaoDispositivo {
  if (
    corpoRecebido === null ||
    typeof corpoRecebido !== "object" ||
    Array.isArray(corpoRecebido)
  ) {
    throw new ErroValidacao("O corpo da requisição deve ser um objeto JSON.");
  }

  const corpo = corpoRecebido as Record<string, unknown>;
  const latitude = normalizarCoordenada(corpo, "latitude", -90, 90);
  const longitude = normalizarCoordenada(corpo, "longitude", -180, 180);

  if ((latitude === null) !== (longitude === null)) {
    throw new ErroValidacao(
      "Latitude e longitude devem ser informadas ou removidas juntas.",
    );
  }

  return {
    rodovia: normalizarTexto(corpo, "rodovia", 100),
    km: normalizarTexto(corpo, "km", 50),
    sentido: normalizarTexto(corpo, "sentido", 100),
    trecho: normalizarTexto(corpo, "trecho", 255),
    latitude,
    longitude,
    origemLocalizacao: normalizarOrigem(corpo),
  };
}

export function criarRoteadorDispositivos(
  dependencias: DependenciasDispositivos,
): Router {
  const roteador = Router();

  roteador.get("/", async (_requisicao: Request, resposta: Response) => {
    try {
      resposta.status(200).json(await dependencias.listarDispositivos());
    } catch (erro) {
      console.error("Erro ao listar dispositivos:", erro);
      resposta.status(500).json({ erro: "Não foi possível listar os dispositivos." });
    }
  });

  roteador.put(
    "/:dispositivoId/localizacao",
    async (requisicao: Request, resposta: Response) => {
      try {
        const dispositivoId = validarDispositivoId(
          requisicao.params.dispositivoId,
        );
        const dados = validarCorpo(requisicao.body);
        const dispositivo = await dependencias.salvarLocalizacaoDispositivo(
          dispositivoId,
          dados,
        );

        resposta.status(200).json({
          mensagem: "Localização do dispositivo salva com sucesso.",
          dispositivo,
        });
      } catch (erro) {
        if (erro instanceof ErroValidacao) {
          resposta.status(400).json({ erro: erro.message });
          return;
        }

        console.error("Erro ao salvar a localização do dispositivo:", erro);
        resposta.status(500).json({
          erro: "Não foi possível salvar a localização do dispositivo.",
        });
      }
    },
  );

  return roteador;
}
