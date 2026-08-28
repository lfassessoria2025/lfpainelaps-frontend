import { corDaSerie } from "@/components/analytics/chart-colors";

interface ChartLegendItem {
  id: number;
  label: string;
}

/**
 * Legenda textual para comparações: a cor é acompanhada pelo nome em vez de
 * ser a única forma de distinguir uma série. Não cria nem persiste dados.
 */
export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  if (items.length < 2) return null;

  return (
    <ul aria-label="Legenda das prefeituras comparadas" className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground">
      {items.map((item, indice) => (
        <li key={item.id} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-sm ring-1 ring-foreground/15"
            style={{ backgroundColor: corDaSerie(indice) }}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
