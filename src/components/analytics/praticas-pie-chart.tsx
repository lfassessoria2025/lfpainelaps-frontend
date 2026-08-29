import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { montarFatiasCumprimento } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";
import { ChartDataSummary } from "@/components/analytics/chart-data-summary";

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
      <ResponsiveContainer width="100%" height={300} minWidth={0}>
        <PieChart>
          <Pie
            data={fatias}
            dataKey="valor"
            nameKey="nome"
            cx="50%"
            cy="50%"
            outerRadius="72%"
            label={false}
          >
            {fatias.map((fatia) => (
              <Cell key={fatia.chave} fill={CORES[fatia.chave]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} ocorrência(s)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <ul aria-label="Legenda do cumprimento agregado" className="grid gap-2 text-sm sm:grid-cols-2">
        {fatias.map((fatia) => (
          <li key={fatia.chave} className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-sm ring-1 ring-foreground/15" style={{ backgroundColor: CORES[fatia.chave] }} />
            <span>{fatia.nome}: <strong className="tabular-nums">{fatia.valor.toLocaleString("pt-BR")}</strong> ocorrência(s)</span>
          </li>
        ))}
      </ul>
      <ChartDataSummary dados={dados} />
    </div>
  );
}
