import {
  Legend,
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

const CORES = ["var(--color-primary)", "#f2994a", "#27ae60", "#eb5757"];

export function PraticasRadarChart({ dados }: PraticasRadarChartProps) {
  if (dados.length === 0) return null;

  const linhas = montarLinhasDoGrafico(dados);

  return (
    <ResponsiveContainer width="100%" height={420}>
      <RadarChart data={linhas} outerRadius="70%">
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis dataKey="pratica" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          formatter={(value) => (value === null ? "sem dado" : `${value}%`)}
          labelFormatter={(_, payload) => (payload?.[0]?.payload as { rotulo?: string })?.rotulo}
        />
        <Legend />
        {dados.map((prefeitura, indice) => (
          <Radar
            key={prefeitura.prefeitura_id}
            dataKey={chaveDaSerie(prefeitura.prefeitura_id)}
            name={prefeitura.prefeitura_nome}
            stroke={CORES[indice % CORES.length]}
            fill={CORES[indice % CORES.length]}
            fillOpacity={0.2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
