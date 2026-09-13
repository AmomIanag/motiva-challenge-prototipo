import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

export interface DispositivoGeorreferenciado extends Dispositivo {
  latitude: number;
  longitude: number;
}

export interface PontoMonitorado {
  dispositivo: DispositivoGeorreferenciado;
  ultimaLeitura: LeituraVegetacao | null;
}

function coordenadasValidas(
  dispositivo: Dispositivo,
): dispositivo is DispositivoGeorreferenciado {
  return (
    dispositivo.latitude !== null &&
    dispositivo.longitude !== null &&
    Number.isFinite(dispositivo.latitude) &&
    Number.isFinite(dispositivo.longitude) &&
    dispositivo.latitude >= -90 &&
    dispositivo.latitude <= 90 &&
    dispositivo.longitude >= -180 &&
    dispositivo.longitude <= 180
  );
}

export function obterUltimasLeiturasPorDispositivo(
  leituras: LeituraVegetacao[],
): Map<string, LeituraVegetacao> {
  const ultimasLeituras = new Map<string, LeituraVegetacao>();

  for (const leitura of leituras) {
    const atual = ultimasLeituras.get(leitura.dispositivoId);
    const instanteLeitura = Date.parse(leitura.medidoEm);
    const instanteAtual = atual ? Date.parse(atual.medidoEm) : Number.NaN;

    if (
      !atual ||
      (Number.isFinite(instanteLeitura) &&
        (!Number.isFinite(instanteAtual) || instanteLeitura > instanteAtual))
    ) {
      ultimasLeituras.set(leitura.dispositivoId, leitura);
    }
  }

  return ultimasLeituras;
}

export function criarPontosMonitorados(
  dispositivos: Dispositivo[],
  leituras: LeituraVegetacao[],
): PontoMonitorado[] {
  const ultimasLeituras = obterUltimasLeiturasPorDispositivo(leituras);

  return dispositivos.filter(coordenadasValidas).map((dispositivo) => ({
    dispositivo,
    ultimaLeitura: ultimasLeituras.get(dispositivo.dispositivoId) ?? null,
  }));
}
