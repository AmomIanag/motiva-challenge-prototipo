"use client";

import type { Dispatch, SetStateAction } from "react";

import { excluirLeituraAcao, limparHistoricoAcao } from "@/app/acoes-leituras";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesGerenciamentoHistorico {
  setLeituras: Dispatch<SetStateAction<LeituraVegetacao[]>>;
  aoLimparHistorico?: () => void;
}

export function useGerenciamentoHistorico({
  setLeituras,
  aoLimparHistorico,
}: PropriedadesGerenciamentoHistorico) {
  async function excluirLeitura(id: string): Promise<void> {
    await excluirLeituraAcao(id);
    setLeituras((atuais) => atuais.filter((leitura) => leitura.id !== id));
  }

  async function limparHistorico(): Promise<void> {
    await limparHistoricoAcao();
    setLeituras([]);
    aoLimparHistorico?.();
  }

  return { excluirLeitura, limparHistorico };
}
