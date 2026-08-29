import type { MetricasIndicadorOut } from "@/lib/api-types";

/**
 * Alternativa textual aos gráficos para telas estreitas e leitores de tela.
 * Trabalha apenas com os mesmos totais agregados do gráfico; não recebe nem
 * deriva lista nominal, CPF/CNS ou qualquer identificador clínico.
 */
export function ChartDataSummary({ dados }: { dados: MetricasIndicadorOut[] }) {
  if (dados.length === 0) return null;

  return (
    <details className="mt-3 rounded-lg border bg-muted/20 p-3 md:hidden">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Ver valores agregados em tabela
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Prática</th>
              {dados.map((item) => <th key={item.prefeitura_id} className="min-w-28 p-2 font-medium">{item.prefeitura_nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {dados[0].praticas.map((pratica) => (
              <tr key={pratica.pratica} className="border-b last:border-0">
                <th scope="row" className="p-2 font-medium">{pratica.pratica} · {pratica.titulo}</th>
                {dados.map((item) => {
                  const metrica = item.praticas.find((candidate) => candidate.pratica === pratica.pratica);
                  return <td key={item.prefeitura_id} className="p-2 tabular-nums">{metrica ? `${metrica.percentual_cumprido}% (${metrica.total_cumprida}/${metrica.total_gestantes})` : "Sem dados validados"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
