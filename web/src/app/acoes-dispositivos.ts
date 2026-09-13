"use server";

import { salvarLocalizacaoDispositivo } from "@/lib/api";
import type { DadosLocalizacaoDispositivo } from "@/types/dispositivo";

export async function salvarLocalizacaoDispositivoAcao(
  dispositivoId: string,
  dados: DadosLocalizacaoDispositivo,
) {
  return salvarLocalizacaoDispositivo(dispositivoId, dados);
}
