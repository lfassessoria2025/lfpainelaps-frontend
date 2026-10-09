import type {
  EquipeSaudeBucalOut,
  FechamentoBucalOut,
  MicroAreaSaudeBucalOut,
  SaudeBucalAcompanhamentoOut,
} from "@/lib/api-types";
import { http } from "@/lib/http";

function filtros(equipes: readonly string[], microAreas: readonly string[]): string {
  const query = new URLSearchParams();
  equipes.forEach((item) => query.append("equipe", item));
  microAreas.forEach((item) => query.append("micro_area", item));
  const serializada = query.toString();
  return serializada ? `?${serializada}` : "";
}

export const saudeBucalService = {
  list: (prefeituraId: number, equipes: readonly string[] = [], microAreas: readonly string[] = [], signal?: AbortSignal) =>
    http.get<SaudeBucalAcompanhamentoOut[]>(`/prefeituras/${prefeituraId}/indicadores/saude-bucal${filtros(equipes, microAreas)}`, signal),
  equipes: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<EquipeSaudeBucalOut[]>(`/prefeituras/${prefeituraId}/indicadores/saude-bucal/equipes`, signal),
  microAreas: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MicroAreaSaudeBucalOut[]>(`/prefeituras/${prefeituraId}/indicadores/saude-bucal/micro-areas`, signal),
  fechamento: (prefeituraId: number, indicador: "B1" | "B2", equipes: readonly string[] = [], microAreas: readonly string[] = [], signal?: AbortSignal) =>
    http.get<FechamentoBucalOut>(`/prefeituras/${prefeituraId}/indicadores/saude-bucal/fechamento?indicador=${indicador}${filtros(equipes, microAreas).replace("?", "&")}`, signal),
  exportar: (prefeituraId: number, indicador: "B1" | "B2", equipes: readonly string[] = [], microAreas: readonly string[] = [], signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/saude-bucal/exportar?indicador=${indicador}${filtros(equipes, microAreas).replace("?", "&")}`, signal),
};
