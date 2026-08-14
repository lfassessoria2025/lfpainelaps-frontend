import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chaveDaSerie, montarLinhasDoGrafico } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";

/**
 * Gráfico genérico de % cumprido por prática — consome o mesmo shape
 * (MetricasIndicadorOut) que qualquer indicador futuro vai devolver, não é
 * acoplado à lógica do C3 especificamente (decisão do PO na fatia FLO-22).
 */
interface PraticasBarChartProps {
  /** Uma entrada por prefeitura — 1 para visão única, 2+ para comparação. */
  dados: MetricasIndicadorOut[];
}

const CORES = ["var(--color-primary)", "#f2994a", "#27ae60", "#eb5757"];

export function PraticasBarChart({ dados }: PraticasBarChartProps) {
  if (dados.length === 0) return null;

  const linhas = montarLinhasDoGrafico(dados);

  // Barras horizontais: o nome completo da prática cabe por extenso no
  // eixo Y, sem precisar rotacionar texto ou truncar (11 categorias com
  // nomes longos não cabem legíveis num eixo X vertical).
  const alturaPorLinha = dados.length > 1 ? 44 : 32;
  const altura = Math.max(360, linhas.length * alturaPorLinha);

  return (
    <ResponsiveContainer width="100%" height={altura}>
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
          width={260}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value) => (value === null ? "sem dado" : `${value}%`)} />
        {dados.length > 1 ? <Legend /> : null}
        {dados.map((prefeitura, indice) => (
          <Bar
            key={prefeitura.prefeitura_id}
            dataKey={chaveDaSerie(prefeitura.prefeitura_id)}
            name={prefeitura.prefeitura_nome}
            fill={CORES[indice % CORES.length]}
            radius={[0, 4, 4, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
