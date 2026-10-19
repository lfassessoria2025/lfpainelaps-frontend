import type { FechamentoVinculoOut, VinculoOut } from "@/lib/api-types";
import { http } from "@/lib/http";

export const vinculoService = {
  list: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<VinculoOut[]>(`/prefeituras/${prefeituraId}/indicadores/vinculo`, signal),
  fechamento: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<FechamentoVinculoOut>(`/prefeituras/${prefeituraId}/indicadores/vinculo/fechamento`, signal),
  exportar: (prefeituraId: number, signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/vinculo/exportar`, signal),
};
