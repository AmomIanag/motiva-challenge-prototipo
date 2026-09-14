import { requisitarApi } from "@/services/api";

interface RespostaSaude {
  status: string;
}

export async function testarSaudeApi(): Promise<void> {
  const resposta = await requisitarApi<RespostaSaude>("/api/saude");

  if (resposta.status !== "ok") {
    throw new Error("A API respondeu, mas o estado de saúde não é o esperado.");
  }
}
