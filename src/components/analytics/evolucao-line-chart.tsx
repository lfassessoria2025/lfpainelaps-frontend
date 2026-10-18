import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLegend } from "@/components/analytics/chart-legend";
import { corDaSerie } from "@/components/analytics/chart-colors";
import {
  chaveDaSerie,
  montarLinhasEvolucao,
  type SerieHistoricaPrefeitura,
} from "@/lib/analytics-chart-data";

export function EvolucaoLineChart({ series }: { series: SerieHistoricaPrefeitura[] }) {
  const linhas = montarLinhasEvolucao(series);
  if (linhas.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há histórico concluído.</p>;
  }
  const media = series.some((serie) => serie.pontos.some((ponto) => ponto.unidade === "media"));
  const maiorValor = Math.max(
    1,
    ...linhas.flatMap((linha) =>
      Object.entries(linha)
        .filter(([chave]) => chave.startsWith("serie_"))
        .map(([, valor]) => (typeof valor === "number" ? valor : 0)),
    ),
  );
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-foreground">Evolução do cumprimento geral</h2>
      <p className="text-xs text-muted-foreground">Evolução agregada por importação; a unidade acompanha o indicador selecionado.</p>
      <ChartLegend items={series.map((serie) => ({ id: serie.prefeitura_id, label: serie.prefeitura_nome }))} />
      <ResponsiveContainer width="100%" height={360} minWidth={0}>
        <LineChart data={linhas} margin={{ top: 16, right: 16, left: 0, bottom: 38 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="data_rotulo" tickLine={false} axisLine={false} minTickGap={28} interval="preserveStartEnd" angle={-28} textAnchor="end" height={54} tick={{ fontSize: 11 }} />
          <YAxis
            domain={media ? [0, Math.ceil(maiorValor)] : [0, 100]}
            tickFormatter={(value: number) => (media ? String(value) : `${value}%`)}
          />
          <Tooltip formatter={(value) => (value === null ? "sem dado" : media ? String(value) : `${value}%`)} />
          {series.map((serie, indice) => (
            <Line
              key={serie.prefeitura_id}
              type="monotone"
              dataKey={chaveDaSerie(serie.prefeitura_id)}
              name={serie.prefeitura_nome}
              stroke={corDaSerie(indice)}
              strokeWidth={2.5}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
