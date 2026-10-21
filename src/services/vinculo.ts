import type {
  FechamentoVinculoOut,
  VinculoNominalOut,
  VinculoOut,
} from "@/lib/api-types";
import { http } from "@/lib/http";

export const vinculoService = {
  list: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<VinculoOut[]>(`/prefeituras/${prefeituraId}/indicadores/vinculo`, signal),
  fechamento: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<FechamentoVinculoOut>(`/prefeituras/${prefeituraId}/indicadores/vinculo/fechamento`, signal),
  nominal: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<VinculoNominalOut[]>(`/prefeituras/${prefeituraId}/indicadores/vinculo/nominal`, signal),
  exportar: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/vinculo/exportar${equipes.length ? `?${equipes.map((item) => `equipe=${encodeURIComponent(item)}`).join("&")}` : ""}`,
      signal,
    ),
  exportarNominal: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/vinculo/exportar-nominal${equipes.length ? `?${equipes.map((item) => `equipe=${encodeURIComponent(item)}`).join("&")}` : ""}`,
      signal,
    ),
};
