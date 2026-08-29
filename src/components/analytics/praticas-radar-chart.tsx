import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { chaveDaSerie, montarLinhasDoGrafico } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";
import { ChartLegend } from "@/components/analytics/chart-legend";
import { ChartDataSummary } from "@/components/analytics/chart-data-summary";
import { corDaSerie } from "@/components/analytics/chart-colors";

/**
 * Radar de comparação entre prefeituras — um eixo por prática, uma série
 * por prefeitura. Reusa montarLinhasDoGrafico/chaveDaSerie (mesmo formato
 * de linha que o bar chart já consome), sem transformação duplicada — o
 * radar só faz sentido com 2+ prefeituras, quem decide esconder a opção
 * com < 2 é a página (analytics-page.tsx).
 *
 * As 11 práticas do C3 usam só a letra (item.pratica) como rótulo do eixo,
 * não o título completo — 11 eixos com texto longo ficam ilegíveis
 * (pesquisa dataviz: radar legível até ~8-11 eixos, no limite superior aqui;
 * rótulo curto é o ajuste necessário pra caber). O nome completo continua
 * disponível no tooltip via `rotulo`.
 */
interface PraticasRadarChartProps {
  /** 2+ prefeituras — radar de 1 prefeitura só não compara nada. */
  dados: MetricasIndicadorOut[];
}

export function PraticasRadarChart({ dados }: PraticasRadarChartProps) {
  if (dados.length === 0) return null;

  const linhas = montarLinhasDoGrafico(dados);

  return (
    <>
      <ChartLegend items={dados.map((prefeitura) => ({ id: prefeitura.prefeitura_id, label: prefeitura.prefeitura_nome }))} />
      <ResponsiveContainer width="100%" height={360} minWidth={0}>
        <RadarChart data={linhas} outerRadius="62%">
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="pratica" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            formatter={(value) => (value === null ? "sem dado" : `${value}%`)}
            labelFormatter={(_, payload) => (payload?.[0]?.payload as { rotulo?: string })?.rotulo}
          />
          {dados.map((prefeitura, indice) => (
            <Radar
              key={prefeitura.prefeitura_id}
              dataKey={chaveDaSerie(prefeitura.prefeitura_id)}
              name={prefeitura.prefeitura_nome}
              stroke={corDaSerie(indice)}
              fill={corDaSerie(indice)}
              fillOpacity={0.2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
      <ChartDataSummary dados={dados} />
    </>
  );
}
