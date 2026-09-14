"use server";

import {
  carregarDadosDispositivos,
  salvarLocalizacaoDispositivo,
} from "@/lib/api";
import type { DadosLocalizacaoDispositivo } from "@/types/dispositivo";

export async function atualizarDispositivosAcao() {
  const dados = await carregarDadosDispositivos();

  return {
    ...dados,
    sincronizadoEm: new Date().toISOString(),
  };
}

export async function salvarLocalizacaoDispositivoAcao(
  dispositivoId: string,
  dados: DadosLocalizacaoDispositivo,
) {
  return salvarLocalizacaoDispositivo(dispositivoId, dados);
}
