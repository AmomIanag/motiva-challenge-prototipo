import type { LeituraVegetacao } from "@/types/leitura";

const URL_API = (process.env.URL_API ?? "http://localhost:3333").replace(
  /\/$/,
  "",
);

async function buscarNaApi<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${URL_API}${caminho}`, {
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new Error(`A API respondeu com o código HTTP ${resposta.status}.`);
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

