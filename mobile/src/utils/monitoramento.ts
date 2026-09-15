import type { Dispositivo } from "@/types/dispositivo";
import type { Intervencao } from "@/types/intervencao";
import type { LeituraVegetacao } from "@/types/leitura";

export type NivelAlerta = "critico" | "atencao";

export interface AlertaOperacional {
  dispositivo: Dispositivo | null;
  dispositivoId: string;
  intervencao: Intervencao | null;
  leitura: LeituraVegetacao;
  nivel: NivelAlerta;
}

function instante(valor: string): number {
  const resultado = Date.parse(valor);
  return Number.isFinite(resultado) ? resultado : Number.NEGATIVE_INFINITY;
}

export function ordenarLeiturasRecentes(leituras: LeituraVegetacao[]): LeituraVegetacao[] {
  return [...leituras].sort((a, b) => {
    const porData = instante(b.medidoEm) - instante(a.medidoEm);
    return porData !== 0 ? porData : b.id.localeCompare(a.id, "pt-BR", { numeric: true });
  });
}

export function obterLeituraMaisRecente(leituras: LeituraVegetacao[]): LeituraVegetacao | null {
  return ordenarLeiturasRecentes(leituras)[0] ?? null;
}

export function obterUltimasLeiturasPorDispositivo(
  leituras: LeituraVegetacao[],
): Map<string, LeituraVegetacao> {
  const ultimas = new Map<string, LeituraVegetacao>();

  for (const leitura of leituras) {
    const atual = ultimas.get(leitura.dispositivoId);
    if (!atual || instante(leitura.medidoEm) > instante(atual.medidoEm)) {
      ultimas.set(leitura.dispositivoId, leitura);
    }
  }

  return ultimas;
}

export function derivarAlertasOperacionais(
  leituras: LeituraVegetacao[],
  dispositivos: Dispositivo[],
  intervencoes: Intervencao[],
): AlertaOperacional[] {
  const dispositivosPorId = new Map(
    dispositivos.map((dispositivo) => [dispositivo.dispositivoId, dispositivo]),
  );
  const intervencoesPorLeitura = new Map(
    intervencoes
      .filter((intervencao): intervencao is Intervencao & { leituraId: string } => intervencao.leituraId !== null)
      .map((intervencao) => [intervencao.leituraId, intervencao]),
  );

  return [...obterUltimasLeiturasPorDispositivo(leituras).values()]
    .filter((leitura) => leitura.status !== "seguro")
    .map((leitura) => ({
      dispositivo: dispositivosPorId.get(leitura.dispositivoId) ?? null,
      dispositivoId: leitura.dispositivoId,
      intervencao: intervencoesPorLeitura.get(leitura.id) ?? null,
      leitura,
      nivel: leitura.status === "perigo" ? "critico" as const : "atencao" as const,
    }))
    .sort((a, b) => {
      const porNivel = Number(a.nivel === "atencao") - Number(b.nivel === "atencao");
      return porNivel !== 0 ? porNivel : instante(b.leitura.medidoEm) - instante(a.leitura.medidoEm);
    });
}
