import { requisitarApi } from "@/services/api";
import type { Dispositivo } from "@/types/dispositivo";

export function listarDispositivos(): Promise<Dispositivo[]> {
  return requisitarApi<Dispositivo[]>("/api/dispositivos");
}
