"use server";

import { excluirLeitura, limparHistorico } from "@/lib/api";

export async function excluirLeituraAcao(id: string): Promise<void> {
  await excluirLeitura(id);
}

export async function limparHistoricoAcao(): Promise<number> {
  return limparHistorico();
}
