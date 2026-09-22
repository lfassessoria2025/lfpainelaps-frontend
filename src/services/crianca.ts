import { http } from "@/lib/http";
import type {
  CriancaAcompanhamentoOut,
  EquipeCriancaOut,
  MetricasEquipeCriancaOut,
  MicroAreaCriancaOut,
} from "@/lib/api-types";

function filtros(equipes: readonly string[], microAreas: readonly string[]): string {
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const criancaService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<CriancaAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/criancas${filtros(equipes, microAreas)}`,
      signal,
    ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeCriancaOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/criancas/equipes`,
      signal,
    ),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaCriancaOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/criancas/micro-areas`,
      signal,
    ),
  compararEquipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MetricasEquipeCriancaOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/criancas/comparacao-equipes`,
      signal,
    ),
  exportar: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/criancas/exportar${filtros(equipes, microAreas)}`,
      signal,
    ),
};
