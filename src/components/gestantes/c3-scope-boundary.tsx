import { CalendarDays, CircleCheck, History } from "lucide-react";

/**
 * Delimita as três leituras de C3 sem deduzir uma a partir da outra. O
 * frontend atual só possui dados de acompanhamento operacional; as visões
 * oficial e histórica ficam explicitamente indisponíveis até a API fornecer
 * competência, INE/denominador e período autorizados.
 */
export function C3ScopeBoundary() {
  return (
    <section aria-label="Escopos de leitura do C3" className="mb-4 grid gap-3 lg:grid-cols-3">
      <div className="rounded-lg border border-primary/25 bg-primary/[0.03] p-3">
        <div className="flex items-start gap-2">
          <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Resultado C3 oficial mensal</p>
            <p className="mt-1 text-xs text-muted-foreground">Sem dados validados nesta tela. A competência, o INE e o denominador aplicável precisam vir da API; ausência não é pontuação zero.</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-start gap-2">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">Acompanhamento operacional</p>
            <p className="mt-1 text-xs text-muted-foreground">Leitura da última extração para busca ativa. Não substitui nem altera o resultado oficial da competência.</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-dashed bg-muted/20 p-3">
        <div className="flex items-start gap-2">
          <History aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Histórico de acompanhamento</p>
            <p className="mt-1 text-xs text-muted-foreground">Quadrimestre e últimos 12 meses serão exibidos separadamente quando o período e os registros validados forem fornecidos pela API.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
