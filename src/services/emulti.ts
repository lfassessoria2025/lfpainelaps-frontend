import type { EmultiM1Out, FechamentoEmultiM1Out } from "@/lib/api-types";
import { http } from "@/lib/http";

function query(equipes: readonly string[]): string {
  return equipes.length ? `?${equipes.map((item) => `equipe=${encodeURIComponent(item)}`).join("&")}` : "";
}

export const emultiService = {
  list: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.get<EmultiM1Out[]>(`/prefeituras/${prefeituraId}/indicadores/emulti-m1${query(equipes)}`, signal),
  fechamento: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.get<FechamentoEmultiM1Out>(`/prefeituras/${prefeituraId}/indicadores/emulti-m1/fechamento${query(equipes)}`, signal),
  exportar: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/emulti-m1/exportar${query(equipes)}`, signal),
};
