const urlConfigurada = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

export function obterUrlApiConfigurada(): string {
  return urlConfigurada.replace(/\/+$/, "");
}

export function obterUrlApi(): string {
  const url = obterUrlApiConfigurada();

  if (!url) {
    throw new Error("Configure EXPO_PUBLIC_API_URL antes de testar a conexão.");
  }

  return url;
}

export function resolverUrlApi(caminho: string): string {
  if (/^https?:\/\//i.test(caminho)) return caminho;

  const caminhoNormalizado = caminho.startsWith("/") ? caminho : `/${caminho}`;
  return `${obterUrlApi()}${caminhoNormalizado}`;
}
