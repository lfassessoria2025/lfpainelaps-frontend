import { useMemo, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MetricasEquipeGestanteOut } from "@/lib/api-types";
import { PRATICAS, type PraticaLetra } from "@/lib/gestante-praticas";

type TeamComparisonProps = {
  equipes: MetricasEquipeGestanteOut[];
  onOpenTeam: (chave: string) => void;
};

function nomeDaEquipe(equipe: MetricasEquipeGestanteOut): string {
  if (equipe.sem_equipe) return "Sem equipe";
  return equipe.nome ?? (equipe.ine ? `Equipe INE ${equipe.ine}` : "Equipe sem nome");
}

export function TeamComparison({ equipes, onOpenTeam }: TeamComparisonProps) {
  const [praticaSelecionada, setPraticaSelecionada] = useState<PraticaLetra>("A");
  const definicao = PRATICAS.find((pratica) => pratica.letra === praticaSelecionada) ?? PRATICAS[0];
  const ranking = useMemo(
    () => equipes
      .map((equipe) => ({
        equipe,
        metrica: equipe.praticas.find((pratica) => pratica.pratica === praticaSelecionada),
      }))
      .toSorted((a, b) => {
        const diferenca = (b.metrica?.percentual_cumprido ?? 0) - (a.metrica?.percentual_cumprido ?? 0);
        return diferenca || nomeDaEquipe(a.equipe).localeCompare(nomeDaEquipe(b.equipe), "pt-BR");
      }),
    [equipes, praticaSelecionada],
  );

  return (
    <section aria-label="Comparação entre equipes" className="mb-3 rounded-lg border bg-card p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="size-4 text-primary" aria-hidden />
            Comparação entre equipes
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mesmo período da lista. Compare pela porcentagem; o total aparece ao lado.
          </p>
        </div>
        <label className="flex w-full flex-col gap-1 text-[11px] font-medium text-muted-foreground sm:w-64">
          Indicador comparado
          <Select
            value={praticaSelecionada}
            onValueChange={(valor) => valor && setPraticaSelecionada(valor as PraticaLetra)}
          >
            <SelectTrigger className="h-8 w-full text-xs" aria-label="Indicador para comparar equipes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PRATICAS.map((pratica) => (
                  <SelectItem key={pratica.letra} value={pratica.letra}>
                    {pratica.letra} · {pratica.rotulo}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="grid gap-1.5" aria-label={`Ranking das equipes em ${definicao.rotulo}`}>
        {ranking.map(({ equipe, metrica }, indice) => {
          const percentual = metrica?.percentual_cumprido ?? 0;
          const cumpridas = metrica?.total_cumprida ?? 0;
          return (
            <div
              key={equipe.chave}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_4rem_auto] items-center gap-x-2 gap-y-1 rounded-md px-1.5 py-1.5 hover:bg-muted/50 sm:grid-cols-[1.5rem_minmax(7rem,1fr)_minmax(6rem,2fr)_4rem_auto]"
            >
              <span className="text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {indice + 1}º
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium" title={nomeDaEquipe(equipe)}>
                  {nomeDaEquipe(equipe)}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {equipe.ine ? `INE ${equipe.ine} · ` : ""}{equipe.total_gestantes} gestante(s)
                </p>
              </div>
              <Progress
                value={percentual}
                className="col-start-2 col-end-4 row-start-2 min-w-0 sm:col-auto sm:row-auto"
                aria-label={`${percentual}%`}
              >
                <ProgressTrack className="h-1.5">
                  <ProgressIndicator />
                </ProgressTrack>
              </Progress>
              <div className="text-right">
                <p className="text-xs font-semibold tabular-nums">{percentual.toLocaleString("pt-BR")}%</p>
                <p className="text-[10px] tabular-nums text-muted-foreground">{cumpridas}/{equipe.total_gestantes}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onOpenTeam(equipe.chave)}
                aria-label={`Ver gestantes da equipe ${nomeDaEquipe(equipe)}`}
                title="Ver gestantes desta equipe"
              >
                <ArrowRight />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
