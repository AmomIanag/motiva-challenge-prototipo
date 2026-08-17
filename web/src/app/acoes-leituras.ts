"use server";

import {
  carregarLeiturasDashboard,
  excluirLeitura,
  limparHistorico,
} from "@/lib/api";

export async function atualizarDashboardAcao() {
  const leituras = await carregarLeiturasDashboard();

  return {
    leituras,
    sincronizadoEm: new Date().toISOString(),
  };
}

export async function excluirLeituraAcao(id: string): Promise<void> {
  await excluirLeitura(id);
}

export async function limparHistoricoAcao(): Promise<number> {
  return limparHistorico();
}
