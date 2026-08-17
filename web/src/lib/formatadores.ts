import type { StatusVegetacao } from "@/types/leitura";

const formatadorAltura = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const formatadorHorario = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatarAltura(alturaCm: number): string {
  return `${formatadorAltura.format(alturaCm)} cm`;
}

export function formatarData(medidoEm: string): string {
  return formatadorDataHora.format(new Date(medidoEm));
}

export function formatarHorario(instante: string): string {
  return formatadorHorario.format(new Date(instante));
}

export function obterRotuloStatus(status: StatusVegetacao): string {
  const rotulos: Record<StatusVegetacao, string> = {
    seguro: "Seguro",
    cuidado: "Cuidado",
    perigo: "Perigo",
  };

  return rotulos[status];
}

export function obterMensagemStatus(status: StatusVegetacao): string {
  const mensagens: Record<StatusVegetacao, string> = {
    seguro: "Vegetação dentro da faixa segura",
    cuidado: "Vegetação exige acompanhamento",
    perigo: "Vegetação em nível crítico",
  };

  return mensagens[status];
}
