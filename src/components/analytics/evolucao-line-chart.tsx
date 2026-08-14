import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CORES_COMPARACAO } from "@/components/analytics/chart-colors";
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
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-foreground">Evolução do cumprimento geral</h2>
      <p className="text-xs text-muted-foreground">Uma linha por prefeitura selecionada.</p>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={linhas} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="data_rotulo" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} />
          <Tooltip formatter={(value) => (value === null ? "sem dado" : `${value}%`)} />
          {series.length > 1 ? <Legend /> : null}
          {series.map((serie, indice) => (
            <Line
              key={serie.prefeitura_id}
              type="monotone"
              dataKey={chaveDaSerie(serie.prefeitura_id)}
              name={serie.prefeitura_nome}
              stroke={CORES_COMPARACAO[indice % CORES_COMPARACAO.length]}
              strokeWidth={2.5}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
