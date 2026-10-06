import type {
  DiabetesAcompanhamentoOut,
  EquipeDiabetesOut,
  FechamentoC4Out,
  MicroAreaDiabetesOut,
} from "@/lib/api-types";
import { http } from "@/lib/http";

function filtros(equipes: readonly string[], microAreas: readonly string[]): string {
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const diabetesService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<DiabetesAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/diabetes${filtros(equipes, microAreas)}`,
      signal,
    ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeDiabetesOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/diabetes/equipes`,
      signal,
    ),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaDiabetesOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/diabetes/micro-areas`,
      signal,
    ),
  fechamento: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<FechamentoC4Out>(
      `/prefeituras/${prefeituraId}/indicadores/diabetes/fechamento${filtros(equipes, microAreas)}`,
      signal,
    ),
  exportar: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/diabetes/exportar${filtros(equipes, microAreas)}`,
      signal,
    ),
};
