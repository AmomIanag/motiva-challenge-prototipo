import { requisitarApi } from "@/services/api";
import type { LeituraVegetacao } from "@/types/leitura";

export function listarLeituras(): Promise<LeituraVegetacao[]> {
  return requisitarApi<LeituraVegetacao[]>("/api/leituras");
}
