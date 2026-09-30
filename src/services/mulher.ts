import type {
  EquipeMulherOut,
  FechamentoC7Out,
  MicroAreaMulherOut,
  MulherAcompanhamentoOut,
} from "@/lib/api-types";
import { http } from "@/lib/http";

function filtros(equipes: readonly string[], microAreas: readonly string[]): string {
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const mulherService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<MulherAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/mulheres${filtros(equipes, microAreas)}`,
      signal,
    ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeMulherOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/mulheres/equipes`,
      signal,
    ),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaMulherOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/mulheres/micro-areas`,
      signal,
    ),
  fechamento: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<FechamentoC7Out>(
      `/prefeituras/${prefeituraId}/indicadores/mulheres/fechamento${filtros(equipes, microAreas)}`,
      signal,
    ),
};
