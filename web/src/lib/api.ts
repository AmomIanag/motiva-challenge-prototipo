import type { LeituraVegetacao } from "@/types/leitura";

const URL_API = (process.env.URL_API ?? "http://localhost:3333").replace(
  /\/$/,
  "",
);

export function obterUrlImagem(caminhoImagem: string): string {
  const caminhoNormalizado = caminhoImagem.startsWith("/")
    ? caminhoImagem
    : `/${caminhoImagem}`;

  return `${URL_API}${caminhoNormalizado}`;
}

async function buscarNaApi<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${URL_API}${caminho}`, {
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new Error(`A API respondeu com o código HTTP ${resposta.status}.`);
  }

  return resposta.json() as Promise<T>;
}

async function excluirNaApi<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${URL_API}${caminho}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as {
      erro?: string;
    } | null;
    throw new Error(
      corpo?.erro ?? `A API respondeu com o código HTTP ${resposta.status}.`,
    );
  }

  return resposta.json() as Promise<T>;
}

export async function carregarLeituras(): Promise<LeituraVegetacao[]> {
  return buscarNaApi<LeituraVegetacao[]>("/api/leituras");
}

export async function carregarUltimaLeitura(): Promise<LeituraVegetacao | null> {
  const resposta = await fetch(`${URL_API}/api/leituras/ultima`, {
    cache: "no-store",
  });

  if (resposta.status === 404) {
    return null;
  }

  if (!resposta.ok) {
    throw new Error(`A API respondeu com o código HTTP ${resposta.status}.`);
  }

  return resposta.json() as Promise<LeituraVegetacao>;
}

export async function carregarDadosDashboard() {
  const [leituras, ultimaLeitura] = await Promise.all([
    carregarLeituras(),
    carregarUltimaLeitura(),
  ]);

  return { leituras, ultimaLeitura };
}

export async function excluirLeitura(id: string): Promise<void> {
  await excluirNaApi<{ leituraId: string }>(
    `/api/leituras/${encodeURIComponent(id)}`,
  );
}

export async function limparHistorico(): Promise<number> {
  const resultado = await excluirNaApi<{
    quantidadeLeiturasRemovidas: number;
  }>("/api/leituras");

  return resultado.quantidadeLeiturasRemovidas;
}
