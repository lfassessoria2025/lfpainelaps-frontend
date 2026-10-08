import type {
  EquipeHipertensaoOut,
  FechamentoC5Out,
  HipertensaoAcompanhamentoOut,
  MicroAreaHipertensaoOut,
} from "@/lib/api-types";
import { http } from "@/lib/http";

function filtros(equipes: readonly string[], microAreas: readonly string[]): string {
  const query = new URLSearchParams();
  equipes.forEach((equipe) => query.append("equipe", equipe));
  microAreas.forEach((microArea) => query.append("micro_area", microArea));
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const hipertensaoService = {
  list: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<HipertensaoAcompanhamentoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/hipertensao${filtros(equipes, microAreas)}`,
      signal,
    ),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeHipertensaoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/hipertensao/equipes`,
      signal,
    ),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaHipertensaoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/hipertensao/micro-areas`,
      signal,
    ),
  fechamento: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.get<FechamentoC5Out>(
      `/prefeituras/${prefeituraId}/indicadores/hipertensao/fechamento${filtros(equipes, microAreas)}`,
      signal,
    ),
  exportar: (
    prefeituraId: number,
    equipes: readonly string[] = [],
    microAreas: readonly string[] = [],
    signal?: AbortSignal,
  ) =>
    http.getBlob(
      `/prefeituras/${prefeituraId}/indicadores/hipertensao/exportar${filtros(equipes, microAreas)}`,
      signal,
    ),
};
