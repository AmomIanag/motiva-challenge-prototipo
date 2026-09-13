import { obterUltimasLeiturasPorDispositivo } from "@/lib/pontos-monitorados";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

export type NivelAlerta = "critico" | "atencao";

export interface AlertaOperacional {
  dispositivoId: string;
  nivel: NivelAlerta;
  leitura: LeituraVegetacao;
  dispositivo: Dispositivo | null;
}

const prioridadeNivel: Record<NivelAlerta, number> = {
  critico: 0,
  atencao: 1,
};

export function derivarAlertasOperacionais(
  leituras: LeituraVegetacao[],
  dispositivos: Dispositivo[],
): AlertaOperacional[] {
  const dispositivosPorId = new Map(
    dispositivos.map((dispositivo) => [dispositivo.dispositivoId, dispositivo]),
  );
  const ultimasLeituras = obterUltimasLeiturasPorDispositivo(leituras);

  return [...ultimasLeituras.values()]
    .filter((leitura) => leitura.status !== "seguro")
    .map((leitura) => ({
      dispositivoId: leitura.dispositivoId,
      nivel: leitura.status === "perigo" ? "critico" as const : "atencao" as const,
      leitura,
      dispositivo: dispositivosPorId.get(leitura.dispositivoId) ?? null,
    }))
    .sort((alertaA, alertaB) => {
      const diferencaPrioridade =
        prioridadeNivel[alertaA.nivel] - prioridadeNivel[alertaB.nivel];

      if (diferencaPrioridade !== 0) return diferencaPrioridade;

      return (
        Date.parse(alertaB.leitura.medidoEm) -
        Date.parse(alertaA.leitura.medidoEm)
      );
    });
}
