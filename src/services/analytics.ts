import type { AnalyticsSnapshotOut, MetricasIndicadorOut, SerieHistoricaPontoOut } from "@/lib/api-types";
import { http } from "@/lib/http";
import { gestanteService } from "@/services/gestante";

function adaptar(snapshot: AnalyticsSnapshotOut): MetricasIndicadorOut {
  return {
    prefeitura_id: snapshot.prefeitura_id,
    prefeitura_nome: snapshot.prefeitura_nome,
    total_gestantes: snapshot.total_elegiveis ?? 0,
    praticas: snapshot.praticas.map((metrica) => ({
      pratica: metrica.codigo,
      titulo: metrica.titulo,
      total_gestantes: metrica.denominador ?? 0,
      total_cumprida: metrica.numerador ?? 0,
      percentual_cumprido: metrica.percentual ?? metrica.valor ?? 0,
    })),
  };
}

export const analyticsService = {
  metricas: async (codigo: string, prefeituraId: number, signal?: AbortSignal) => {
    const indicador = codigo.toUpperCase();
    if (indicador === "C3") return signal === undefined
      ? gestanteService.metricas(prefeituraId)
      : gestanteService.metricas(prefeituraId, [], [], signal);
    const snapshot = await http.get<AnalyticsSnapshotOut>(
      `/prefeituras/${prefeituraId}/indicadores/${encodeURIComponent(indicador)}/analytics`,
      signal,
    );
    return adaptar(snapshot);
  },
  comparar: async (codigo: string, prefeituraIds: number[], signal?: AbortSignal) => {
    const indicador = codigo.toUpperCase();
    if (indicador === "C3") return signal === undefined
      ? gestanteService.comparar(prefeituraIds)
      : gestanteService.comparar(prefeituraIds, signal);
    const query = new URLSearchParams(prefeituraIds.map((id) => ["prefeitura_id", String(id)]));
    const snapshots = await http.get<AnalyticsSnapshotOut[]>(
      `/indicadores/${encodeURIComponent(indicador)}/analytics/comparar?${query.toString()}`,
      signal,
    );
    return snapshots.map(adaptar);
  },
  historico: (codigo: string, prefeituraId: number, signal?: AbortSignal) =>
    http.get<SerieHistoricaPontoOut[]>(
      `/prefeituras/${prefeituraId}/indicadores/${encodeURIComponent(codigo.toUpperCase())}/analytics/historico`,
      signal,
    ),
};
