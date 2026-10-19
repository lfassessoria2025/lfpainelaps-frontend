import { CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerieHistoricaPontoOut } from "@/lib/api-types";
import { formatarValorAnalytics } from "@/lib/analytics-chart-data";

/**
 * O backend serializa `datetime` como ISO completo (ex.:
 * `2026-10-01T00:00:00`), enquanto algumas fontes legadas usam somente a
 * data (`2026-10-01`). Nunca concatenar `T00:00:00` sem verificar o formato:
 * isso produz `...T00:00:00T00:00:00`, uma data inválida que fazia o
 * ErrorBoundary derrubar as rotas M1/C1 ao renderizar o histórico.
 *
 * A competência é uma data civil. Por isso usamos apenas os dez primeiros
 * caracteres e UTC, evitando que o fuso do navegador mude o mês exibido.
 */
function parseDataReferencia(valor: string): Date | null {
  const data = valor.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const resultado = new Date(`${data}T00:00:00Z`);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function quadrimestre(data: string): string {
  const parsed = parseDataReferencia(data);
  if (!parsed) return "—";
  const mes = parsed.getUTCMonth() + 1;
  return `${Math.ceil(mes / 4)}º quadrimestre`;
}

function mesReferencia(data: string): string {
  const parsed = parseDataReferencia(data);
  return parsed
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(parsed)
    : "—";
}

function resultado(ponto: SerieHistoricaPontoOut): string {
  const valor = ponto.valor_total ?? ponto.praticas[0]?.valor ?? ponto.praticas[0]?.percentual_cumprido ?? null;
  return formatarValorAnalytics(valor, ponto.unidade ?? "percentual");
}

export function HistoricoMensal({ pontos, titulo = "Histórico mensal" }: { pontos: SerieHistoricaPontoOut[]; titulo?: string }) {
  const ordenados = [...pontos].sort((a, b) => {
    const dataA = parseDataReferencia(a.data_referencia)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const dataB = parseDataReferencia(b.data_referencia)?.getTime() ?? Number.NEGATIVE_INFINITY;
    return dataB - dataA || b.data_referencia.localeCompare(a.data_referencia);
  });
  return <Card className="mt-4 overflow-hidden py-0">
    <CardHeader className="border-b px-4 py-3"><CardTitle className="flex items-center gap-2 text-sm"><CalendarRange className="size-4 text-primary" />{titulo}</CardTitle><p className="text-xs text-muted-foreground">Competências mensais com o quadrimestre identificado para conferência do fechamento.</p></CardHeader>
    <CardContent className="overflow-x-auto p-0">
      {ordenados.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Ainda não há competências mensais importadas.</p> : <table className="w-full min-w-[560px] text-xs"><thead className="border-b bg-muted/20"><tr><th className="px-4 py-3 text-left font-medium">Mês de referência</th><th className="px-4 py-3 text-left font-medium">Quadrimestre</th><th className="px-4 py-3 text-right font-medium">Numerador</th><th className="px-4 py-3 text-right font-medium">Denominador</th><th className="px-4 py-3 text-right font-medium">Resultado</th></tr></thead><tbody>{ordenados.map((ponto) => <tr key={`${ponto.importacao_id}-${ponto.data_referencia}`} className="border-b last:border-0"><td className="px-4 py-3">{mesReferencia(ponto.data_referencia)}</td><td className="px-4 py-3">{quadrimestre(ponto.data_referencia)}</td><td className="px-4 py-3 text-right tabular-nums">{ponto.praticas.reduce((soma, pratica) => soma + pratica.total_cumprida, 0).toLocaleString("pt-BR")}</td><td className="px-4 py-3 text-right tabular-nums">{ponto.praticas.reduce((soma, pratica) => soma + pratica.total_gestantes, 0).toLocaleString("pt-BR")}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{resultado(ponto)}</td></tr>)}</tbody></table>}
    </CardContent>
  </Card>;
}
