import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Badge } from "@/components/ui/badge";
import { montarFatiasCumprimento } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";

/**
 * Pizza "cumprida vs. não-cumprida" — agregado de TODAS as práticas (e, em
 * modo comparação, de TODAS as prefeituras selecionadas) somadas numa única
 * fatia por status. Decisão do PO: o contrato da API (MetricaPraticaOut) só
 * tem agregado por prática, não pontuação por gestante, então não dá pra
 * fazer "distribuição por faixa de pontuação" sem mudar o backend — essa
 * pizza usa só o que já existe (total_cumprida / total_gestantes).
 *
 * Em modo comparação, as prefeituras entram somadas no mesmo agregado (v1
 * simples) — por isso o título deixa "agregado" explícito, pra não passar a
 * impressão de que é o resultado de uma prefeitura só.
 */
interface PraticasPieChartProps {
  dados: MetricasIndicadorOut[];
}

const CORES: Record<string, string> = {
  cumprida: "var(--color-primary)",
  nao_cumprida: "#eb5757",
};

export function PraticasPieChart({ dados }: PraticasPieChartProps) {
  const fatias = montarFatiasCumprimento(dados);

  if (fatias.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {dados.length > 1 ? (
          <Badge variant="secondary">Agregado de {dados.length} prefeituras</Badge>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Cumprimento agregado — soma de todas as práticas
          {dados.length > 1 ? " e prefeituras selecionadas" : ""}.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Pie
            data={fatias}
            dataKey="valor"
            nameKey="nome"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={(entry: PieLabelRenderProps) =>
              `${entry.name}: ${((Number(entry.percent) || 0) * 100).toFixed(0)}%`
            }
          >
            {fatias.map((fatia) => (
              <Cell key={fatia.chave} fill={CORES[fatia.chave]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
