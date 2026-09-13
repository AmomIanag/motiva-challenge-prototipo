"use server";

import {
  atualizarStatusIntervencao,
  carregarDadosIntervencoes,
  criarIntervencao,
} from "@/lib/api";
import type { StatusIntervencao } from "@/types/intervencao";

export async function atualizarIntervencoesAcao() {
  return carregarDadosIntervencoes();
}

export async function criarIntervencaoAcao(leituraId: string) {
  try {
    return { sucesso: true as const, intervencao: await criarIntervencao(leituraId) };
  } catch (falha) {
    return {
      sucesso: false as const,
      erro: falha instanceof Error ? falha.message : "Não foi possível criar a intervenção.",
    };
  }
}

export async function atualizarStatusIntervencaoAcao(
  id: string,
  status: StatusIntervencao,
) {
  try {
    return {
      sucesso: true as const,
      intervencao: await atualizarStatusIntervencao(id, status),
    };
  } catch (falha) {
    return {
      sucesso: false as const,
      erro: falha instanceof Error ? falha.message : "Não foi possível atualizar a intervenção.",
    };
  }
}
