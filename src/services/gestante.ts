import { http } from "@/lib/http";
import type {
  EquipeGestanteOut,
  GestanteAcompanhamentoOut,
  MetricasIndicadorOut,
  SerieHistoricaPontoOut,
} from "@/lib/api-types";

function queryEquipes(equipes: readonly string[]): string {
  if (equipes.length === 0) return "";
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  return `?${query.toString()}`;
}

export const gestanteService = {
  list: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.get<GestanteAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes${queryEquipes(equipes)}`,
      signal,
    ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeGestanteOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/equipes`,
      signal,
    ),
  exportar: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/exportar${queryEquipes(equipes)}`,
      signal,
    ),
  metricas: (prefeituraId: number, equipes: readonly string[] = [], signal?: AbortSignal) =>
    http.get<MetricasIndicadorOut>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/metricas${queryEquipes(equipes)}`,
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
