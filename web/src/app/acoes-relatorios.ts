"use server";

import { carregarDadosRelatorios } from "@/lib/api";

export async function atualizarRelatoriosAcao() {
  const dados = await carregarDadosRelatorios();

  return {
    ...dados,
    sincronizadoEm: new Date().toISOString(),
  };
}
