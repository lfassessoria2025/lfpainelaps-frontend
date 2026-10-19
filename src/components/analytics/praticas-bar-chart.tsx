import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chaveDaSerie, formatarValorAnalytics, montarLinhasDoGrafico, unidadeDosDados } from "@/lib/analytics-chart-data";
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
  /** Barras horizontais preservam rótulos longos; verticais ajudam a comparar poucos recortes. */
  orientation?: "horizontal" | "vertical";
}

function quebrarRotulo(valor: string): string[] {
  const [codigo, ...resto] = valor.split(" · ");
  const nome = resto.join(" · ");
  if (!nome) return [codigo];
  const palavras = nome.split(/\s+/);
  const linhas: string[] = [codigo];
  let linha = "";
  for (const palavra of palavras) {
    const candidata = linha ? `${linha} ${palavra}` : palavra;
    if (linha && candidata.length > 22) {
      linhas.push(linha);
      linha = palavra;
    } else {
      linha = candidata;
    }
  }
  if (linha) linhas.push(linha);
  return linhas.slice(0, 3);
}

function RotuloEixo({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: unknown } }) {
  const linhas = quebrarRotulo(String(payload?.value ?? ""));
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill="currentColor" fontSize={11}>
        {linhas.map((linha, indice) => <tspan key={`${linha}-${indice}`} x={0} dy={indice === 0 ? 0 : 13}>{linha}</tspan>)}
      </text>
    </g>
  );
}

export function PraticasBarChart({ dados, orientation = "horizontal" }: PraticasBarChartProps) {
  if (dados.length === 0) return null;

  const linhas = montarLinhasDoGrafico(dados);
  const unidade = unidadeDosDados(dados);
  const valores = linhas.flatMap((linha) => Object.entries(linha).filter(([chave]) => chave.startsWith("serie_")).map(([, valor]) => typeof valor === "number" ? valor : 0));
  const maximo = Math.max(1, ...valores);
  const dominio = unidade === "percentual" ? [0, 100] : [0, Math.ceil(maximo * 1.1)];
  const horizontal = orientation === "horizontal";

  // Barras horizontais: o nome completo da prática cabe por extenso no
  // eixo Y, sem precisar rotacionar texto ou truncar (11 categorias com
  // nomes longos não cabem legíveis num eixo X vertical).
  const alturaPorLinha = dados.length > 1 ? 44 : 32;
  const altura = horizontal ? Math.max(360, linhas.length * alturaPorLinha) : 380;

  return (
    <>
      <ChartLegend items={dados.map((prefeitura) => ({ id: prefeitura.prefeitura_id, label: prefeitura.prefeitura_nome }))} />
      <ResponsiveContainer width="100%" height={altura} minWidth={0}>
        <BarChart
          data={linhas}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={horizontal ? { top: 8, right: 24, left: 8, bottom: 8 } : { top: 16, right: 16, left: 8, bottom: 48 }}
          barCategoryGap={dados.length > 1 ? 12 : 6}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={horizontal} vertical={!horizontal} className="stroke-border" />
          {horizontal ? <XAxis
            type="number"
            domain={dominio}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => unidade === "percentual" ? `${value}%` : String(value)}
          /> : <XAxis
            type="category"
            dataKey="rotulo"
            interval={0}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(value: string) => String(value).split(" · ")[0] ?? value}
          />}
          {horizontal ? <YAxis
            type="category"
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            width={154}
            tick={<RotuloEixo />}
          /> : <YAxis
            type="number"
            domain={dominio}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => unidade === "percentual" ? `${value}%` : String(value)}
          />}
          <Tooltip formatter={(value) => formatarValorAnalytics(typeof value === "number" ? value : null, unidade)} />
          {dados.map((prefeitura, indice) => (
            <Bar
              key={prefeitura.prefeitura_id}
              dataKey={chaveDaSerie(prefeitura.prefeitura_id)}
              name={prefeitura.prefeitura_nome}
              fill={corDaSerie(indice)}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-muted-foreground">Os eixos usam os códigos dos parâmetros; o tooltip e a tabela trazem o nome completo.</p>
      <ChartDataSummary dados={dados} />
    </>
  );
}
