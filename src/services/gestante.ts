import { http } from "@/lib/http";
import type {
  EquipeGestanteOut,
  GestanteAcompanhamentoOut,
  MetricasIndicadorOut,
  MicroAreaGestanteOut,
  SerieHistoricaPontoOut,
} from "@/lib/api-types";

function queryFiltros(equipes: readonly string[], microAreas: readonly string[]): string {
  if (equipes.length === 0 && microAreas.length === 0) return "";
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  return `?${query.toString()}`;
}

export const gestanteService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<GestanteAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes${queryFiltros(equipes, microAreas)}`,
      signal,
    ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeGestanteOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/equipes`,
      signal,
    ),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaGestanteOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/micro-areas`,
      signal,
    ),
  exportar: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/exportar${queryFiltros(equipes, microAreas)}`,
      signal,
    ),
  metricas: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<MetricasIndicadorOut>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/metricas${queryFiltros(equipes, microAreas)}`,
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
