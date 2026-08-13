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

  // Chave por prefeitura_id (único de fato), nunca por nome — duas
  // prefeituras podem ter o mesmo `name` (só `ibge_code` é único no banco),
  // e uma chave por nome faria uma sobrescrever a outra silenciosamente no
  // gráfico de comparação (achado do CR na Fase C, corrigido aqui). O nome
  // vai só na prop `name` do <Bar>, que o recharts já usa como rótulo do
  // tooltip/legenda automaticamente — não precisa duplicar lookup aqui.
  const chaveDaSerie = (prefeituraId: number) => `serie_${prefeituraId}`;

  const praticas = dados[0].praticas.map((p) => p.pratica);
  const linhas = praticas.map((pratica) => {
    const linha: Record<string, string | number | null> = { pratica };
    for (const prefeitura of dados) {
      const item = prefeitura.praticas.find((p) => p.pratica === pratica);
      linha[chaveDaSerie(prefeitura.prefeitura_id)] = item?.percentual_cumprido ?? null;
    }
    return linha;
  });

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={linhas} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="pratica" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
        />
        <Tooltip formatter={(value) => (value === null ? "sem dado" : `${value}%`)} />
        {dados.length > 1 ? <Legend /> : null}
        {dados.map((prefeitura, indice) => (
          <Bar
            key={prefeitura.prefeitura_id}
            dataKey={chaveDaSerie(prefeitura.prefeitura_id)}
            name={prefeitura.prefeitura_nome}
            fill={CORES[indice % CORES.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
