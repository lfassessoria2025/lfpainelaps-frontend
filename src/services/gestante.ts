import { http } from "@/lib/http";
import type {
  GestanteAcompanhamentoOut,
  MetricasIndicadorOut,
  SerieHistoricaPontoOut,
} from "@/lib/api-types";

export const gestanteService = {
  list: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<GestanteAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes`,
      signal,
    ),
  exportar: (prefeituraId: number, signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/gestantes/exportar`, signal),
  metricas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MetricasIndicadorOut>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/metricas`,
      signal,
    ),
  serieHistorica: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<SerieHistoricaPontoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/serie-historica`,
      signal,
    ),
  comparar: (prefeituraIds: number[], signal?: AbortSignal) => {
    const query = prefeituraIds.map((id) => `prefeitura_id=${id}`).join("&");
    return http.get<MetricasIndicadorOut[]>(`/indicadores/gestantes/comparar?${query}`, signal);
  },
};
