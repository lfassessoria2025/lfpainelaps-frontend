import { http } from "@/lib/http";
import type { GestanteAcompanhamentoOut } from "@/lib/api-types";

export const gestanteService = {
  list: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<GestanteAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes`,
      signal,
    ),
  exportar: (prefeituraId: number, signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/gestantes/exportar`, signal),
};
