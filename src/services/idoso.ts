import type {
  EquipeIdosoOut,
  FechamentoC6Out,
  IdosoAcompanhamentoOut,
  MicroAreaIdosoOut,
} from "@/lib/api-types";
import { http } from "@/lib/http";

function filtros(equipes: readonly string[], microAreas: readonly string[]): string {
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const idosoService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) => http.get<IdosoAcompanhamentoOut[]>(
    `/prefeituras/${prefeituraId}/indicadores/idosos${filtros(equipes, microAreas)}`,
    signal,
  ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeIdosoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/idosos/equipes`, signal,
    ),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaIdosoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/idosos/micro-areas`, signal,
    ),
  fechamento: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) => http.get<FechamentoC6Out>(
      `/prefeituras/${prefeituraId}/indicadores/idosos/fechamento${filtros(equipes, microAreas)}`,
      signal,
    ),
  exportar: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) => http.getBlob(
    `/prefeituras/${prefeituraId}/indicadores/idosos/exportar${filtros(equipes, microAreas)}`,
    signal,
  ),
};
