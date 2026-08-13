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

  // O nome completo da prática vem do backend (item.titulo, mesmo campo
  // usado por qualquer indicador futuro) — o eixo mostra o rótulo por
  // extenso em vez de só a letra, pedido explícito da cliente pra
  // reconhecer as práticas do jeito que já vê na planilha dela.
  const praticas = dados[0].praticas.map((p) => ({ pratica: p.pratica, titulo: p.titulo }));
  const linhas = praticas.map(({ pratica, titulo }) => {
    const linha: Record<string, string | number | null> = {
      pratica,
      rotulo: `${pratica} · ${titulo}`,
    };
    for (const prefeitura of dados) {
      const item = prefeitura.praticas.find((p) => p.pratica === pratica);
      linha[chaveDaSerie(prefeitura.prefeitura_id)] = item?.percentual_cumprido ?? null;
    }
    return linha;
  });

  // Barras horizontais: o nome completo da prática cabe por extenso no
  // eixo Y, sem precisar rotacionar texto ou truncar (11 categorias com
  // nomes longos não cabem legíveis num eixo X vertical).
  const alturaPorLinha = dados.length > 1 ? 44 : 32;
  const altura = Math.max(360, praticas.length * alturaPorLinha);

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
