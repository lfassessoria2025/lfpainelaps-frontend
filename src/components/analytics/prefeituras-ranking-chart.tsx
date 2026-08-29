import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { montarRankingPrefeituras } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";

interface PrefeiturasRankingChartProps {
  dados: MetricasIndicadorOut[];
}

export function PrefeiturasRankingChart({ dados }: PrefeiturasRankingChartProps) {
  const ranking = montarRankingPrefeituras(dados);
  const altura = Math.max(280, ranking.length * 52);

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-foreground">Ranking geral</h2>
      <p className="text-xs text-muted-foreground">
        Percentual ponderado de práticas cumpridas por prefeitura selecionada.
      </p>
      <ResponsiveContainer width="100%" height={altura} minWidth={0}>
        <BarChart
          data={ranking}
          layout="vertical"
          margin={{ top: 16, right: 52, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="prefeitura_nome"
            tickLine={false}
            axisLine={false}
            width={96}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: string) => String(value).length > 14 ? `${String(value).slice(0, 13)}…` : value}
          />
          <Tooltip formatter={(value) => `${value}%`} />
          <Bar dataKey="percentual_cumprido" name="Cumprimento geral" fill="var(--color-primary)" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="percentual_cumprido"
              position="right"
              formatter={(value) => `${value}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
