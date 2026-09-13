import type { LeituraVegetacao } from "@/types/leitura";
import type {
  DadosLocalizacaoDispositivo,
  Dispositivo,
} from "@/types/dispositivo";

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

async function atualizarNaApi<T>(caminho: string, corpo: unknown): Promise<T> {
  const resposta = await fetch(`${URL_API}${caminho}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    const conteudo = (await resposta.json().catch(() => null)) as {
      erro?: string;
    } | null;
    throw new Error(
      conteudo?.erro ?? `A API respondeu com o código HTTP ${resposta.status}.`,
    );
  }

  return resposta.json() as Promise<T>;
}

export async function carregarLeituras(): Promise<LeituraVegetacao[]> {
  return buscarNaApi<LeituraVegetacao[]>("/api/leituras");
}

export async function carregarLeiturasDashboard(): Promise<LeituraVegetacao[]> {
  const leituras = await carregarLeituras();

  return leituras.map((leitura) => ({
    ...leitura,
    imagemUrl: leitura.imagemUrl ? obterUrlImagem(leitura.imagemUrl) : null,
    imagemDiagnosticoUrl: leitura.imagemDiagnosticoUrl
      ? obterUrlImagem(leitura.imagemDiagnosticoUrl)
      : null,
  }));
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

export async function carregarDispositivos(): Promise<Dispositivo[]> {
  return buscarNaApi<Dispositivo[]>("/api/dispositivos");
}

export async function salvarLocalizacaoDispositivo(
  dispositivoId: string,
  dados: DadosLocalizacaoDispositivo,
): Promise<Dispositivo> {
  const resultado = await atualizarNaApi<{
    mensagem: string;
    dispositivo: Dispositivo;
  }>(
    `/api/dispositivos/${encodeURIComponent(dispositivoId)}/localizacao`,
    dados,
  );

  return resultado.dispositivo;
}

export async function carregarDadosAlertas() {
  const [leituras, dispositivos] = await Promise.all([
    carregarLeituras(),
    carregarDispositivos(),
  ]);

  return { leituras, dispositivos };
}
