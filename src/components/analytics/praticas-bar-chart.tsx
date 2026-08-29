import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chaveDaSerie, montarLinhasDoGrafico } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";
import { ChartLegend } from "@/components/analytics/chart-legend";
import { ChartDataSummary } from "@/components/analytics/chart-data-summary";
import { corDaSerie } from "@/components/analytics/chart-colors";

/**
 * Gráfico genérico de % cumprido por prática — consome o mesmo shape
 * (MetricasIndicadorOut) que qualquer indicador futuro vai devolver, não é
 * acoplado à lógica do C3 especificamente (decisão do PO na fatia FLO-22).
 */
interface PraticasBarChartProps {
  /** Uma entrada por prefeitura — 1 para visão única, 2+ para comparação. */
  dados: MetricasIndicadorOut[];
}

export function PraticasBarChart({ dados }: PraticasBarChartProps) {
  if (dados.length === 0) return null;

  const linhas = montarLinhasDoGrafico(dados);

  // Barras horizontais: o nome completo da prática cabe por extenso no
  // eixo Y, sem precisar rotacionar texto ou truncar (11 categorias com
  // nomes longos não cabem legíveis num eixo X vertical).
  const alturaPorLinha = dados.length > 1 ? 44 : 32;
  const altura = Math.max(360, linhas.length * alturaPorLinha);

  return (
    <>
      <ChartLegend items={dados.map((prefeitura) => ({ id: prefeitura.prefeitura_id, label: prefeitura.prefeitura_nome }))} />
      <ResponsiveContainer width="100%" height={altura} minWidth={0}>
        <BarChart
          data={linhas}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          barCategoryGap={dados.length > 1 ? 12 : 6}
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
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            width={42}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: string) => String(value).split(" · ")[0] ?? value}
          />
          <Tooltip formatter={(value) => (value === null ? "sem dado" : `${value}%`)} />
          {dados.map((prefeitura, indice) => (
            <Bar
              key={prefeitura.prefeitura_id}
              dataKey={chaveDaSerie(prefeitura.prefeitura_id)}
              name={prefeitura.prefeitura_nome}
              fill={corDaSerie(indice)}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-muted-foreground">Os eixos usam A–K para caber na tela; o tooltip e a tabela trazem o nome completo.</p>
      <ChartDataSummary dados={dados} />
    </>
  );
}
