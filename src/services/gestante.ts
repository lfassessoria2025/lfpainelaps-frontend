import { http } from "@/lib/http";
import type {
  DiagnosticoC3Out,
  EquipeGestanteOut,
  GestanteAcompanhamentoOut,
  MetricasIndicadorOut,
  MicroAreaGestanteOut,
  RecorteGestante,
  SerieHistoricaPontoOut,
} from "@/lib/api-types";

function queryFiltros(
  equipes: readonly string[],
  microAreas: readonly string[],
  recorte: RecorteGestante = "atual",
): string {
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  if (recorte !== "atual") query.set("recorte", recorte);
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const gestanteService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
    recorte: RecorteGestante = "atual",
  ) =>
    http.get<GestanteAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes${queryFiltros(equipes, microAreas, recorte)}`,
      signal,
    ),
  equipes: (
    prefeituraId: number,
    signal?: AbortSignal,
    recorte: RecorteGestante = "atual",
  ) =>
    http.get<EquipeGestanteOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/equipes${queryFiltros([], [], recorte)}`,
      signal,
    ),
  microAreas: (
    prefeituraId: number,
    signal?: AbortSignal,
    recorte: RecorteGestante = "atual",
  ) =>
    http.get<MicroAreaGestanteOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/micro-areas${queryFiltros([], [], recorte)}`,
      signal,
    ),
  exportar: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
    recorte: RecorteGestante = "atual",
  ) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/exportar${queryFiltros(equipes, microAreas, recorte)}`,
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
  diagnostico: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<DiagnosticoC3Out>(
      `/prefeituras/${prefeituraId}/indicadores/gestantes/diagnostico`,
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
