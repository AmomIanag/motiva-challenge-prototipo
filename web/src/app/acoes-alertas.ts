"use server";

import { carregarDadosAlertas } from "@/lib/api";

export async function atualizarAlertasAcao() {
  const dados = await carregarDadosAlertas();

  return {
    ...dados,
    sincronizadoEm: new Date().toISOString(),
  };
}
