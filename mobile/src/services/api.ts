import { obterUrlApi } from "@/lib/configuracao-api";

export class ErroApi extends Error {
  constructor(
    mensagem: string,
    public readonly status?: number,
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

export function descreverErroApi(erro: unknown, mensagemPadrao: string): string {
  if (erro instanceof ErroApi) {
    return erro.status ? `HTTP ${erro.status} — ${erro.message}` : erro.message;
  }

  return erro instanceof Error ? erro.message : mensagemPadrao;
}

export async function requisitarApi<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const caminhoNormalizado = caminho.startsWith("/") ? caminho : `/${caminho}`;
  const urlApi = obterUrlApi();
  let resposta: Response;

  try {
    resposta = await fetch(`${urlApi}${caminhoNormalizado}`, {
      ...opcoes,
      headers: {
        Accept: "application/json",
        ...opcoes.headers,
      },
    });
  } catch {
    throw new ErroApi("Não foi possível acessar a API.");
  }

  const conteudo = await resposta.text();
  let dados: unknown;

  try {
    dados = conteudo ? JSON.parse(conteudo) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    const mensagem =
      dados && typeof dados === "object" && "erro" in dados && typeof dados.erro === "string"
        ? dados.erro
        : `A API respondeu com HTTP ${resposta.status}.`;

    throw new ErroApi(mensagem, resposta.status);
  }

  return dados as T;
}
