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
