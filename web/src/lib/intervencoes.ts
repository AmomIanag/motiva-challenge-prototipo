import type { Intervencao, StatusIntervencao } from "@/types/intervencao";

export const ROTULOS_STATUS_INTERVENCAO: Record<StatusIntervencao, string> = {
  pendente: "Pendente",
  em_atendimento: "Em atendimento",
  concluida: "Concluída",
};

export function obterProximoStatusIntervencao(
  status: StatusIntervencao,
): StatusIntervencao | null {
  if (status === "pendente") return "em_atendimento";
  if (status === "em_atendimento") return "concluida";
  return null;
}

export function coordenadasIntervencaoValidas(intervencao: Intervencao): boolean {
  return (
    intervencao.latitude !== null &&
    intervencao.longitude !== null &&
    Number.isFinite(intervencao.latitude) &&
    Number.isFinite(intervencao.longitude)
  );
}

export function formatarLocalizacaoIntervencao(intervencao: Intervencao): string {
  const partes = [
    intervencao.rodovia,
    intervencao.km ? `Km ${intervencao.km}` : null,
    intervencao.sentido ? `Sentido ${intervencao.sentido}` : null,
  ].filter(Boolean);

  return partes.join(" · ") || "Localização operacional não cadastrada.";
}

const ordemCampoStatus: Record<StatusIntervencao, number> = {
  em_atendimento: 0,
  pendente: 1,
  concluida: 2,
};

export function ordenarIntervencoesCampo(
  intervencoes: Intervencao[],
): Intervencao[] {
  return [...intervencoes].sort((a, b) => {
    const status = ordemCampoStatus[a.status] - ordemCampoStatus[b.status];
    if (status !== 0) return status;

    const prioridade =
      Number(a.prioridade === "moderada") - Number(b.prioridade === "moderada");
    if (prioridade !== 0) return prioridade;

    const antiguidade = Date.parse(a.criadaEm) - Date.parse(b.criadaEm);
    if (antiguidade !== 0) return antiguidade;

    return a.id.localeCompare(b.id, "pt-BR", { numeric: true });
  });
}
