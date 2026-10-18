import type {
  EmultiM1Out,
  EmultiM2Out,
  FechamentoEmultiM1Out,
  FechamentoEmultiM2Out,
} from "@/lib/api-types";
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
  listM2: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.get<EmultiM2Out[]>(`/prefeituras/${prefeituraId}/indicadores/emulti-m2${query(equipes)}`, signal),
  fechamentoM2: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.get<FechamentoEmultiM2Out>(
      `/prefeituras/${prefeituraId}/indicadores/emulti-m2/fechamento${query(equipes)}`,
      signal,
    ),
  exportarM2: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/emulti-m2/exportar${query(equipes)}`, signal),
};
