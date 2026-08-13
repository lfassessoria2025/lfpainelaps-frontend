import { useCallback, useEffect, useState } from "react";
import { BarChart3, Lock, ShieldAlert } from "lucide-react";
import { PraticasBarChart } from "@/components/analytics/praticas-bar-chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { MetricasIndicadorOut, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";

export function AnalyticsPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [metricas, setMetricas] = useState<MetricasIndicadorOut | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    prefeiturasService
      .list()
      .then((data) => {
        setPrefeituras(data);
        const primeiraAtiva = data.find((p) => p.active) ?? data[0];
        if (primeiraAtiva) setSelectedId(primeiraAtiva.id);
      })
      .catch(() => setPrefeituras([]));
  }, []);

  const loadMetricas = useCallback(async () => {
    if (selectedId === null) return;
    try {
      const data = await gestanteService.metricas(selectedId);
      setMetricas(data);
      setLoadError(null);
      setForbidden(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
        setMetricas(null);
        setLoadError(null);
        return;
      }
      setForbidden(false);
      setLoadError(
        err instanceof ApiError ? err.detail : "Não foi possível carregar as métricas.",
      );
    }
  }, [selectedId]);

  useEffect(() => {
    setMetricas(null);
    setForbidden(false);
    void loadMetricas();
  }, [loadMetricas]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Indicador C3 (Gestantes) — % de cumprimento por prática, filtrado por prefeitura."
      />

      <div className="mb-4 max-w-xs">
        {prefeituras === null ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={selectedId ? String(selectedId) : undefined}
            onValueChange={(value) => value && setSelectedId(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a prefeitura">
                {(value: string | null) =>
                  prefeituras.find((prefeitura) => String(prefeitura.id) === value)?.name ??
                  "Selecione a prefeitura"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {prefeituras.map((prefeitura) => (
                  <SelectItem key={prefeitura.id} value={String(prefeitura.id)}>
                    {prefeitura.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      {prefeituras !== null && prefeituras.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre uma prefeitura para visualizar o Analytics.
        </p>
      ) : forbidden ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock />
            </EmptyMedia>
            <EmptyTitle>Sem permissão para ver este indicador</EmptyTitle>
            <EmptyDescription>
              Você não tem a permissão "Visualizar indicador de gestantes (C3)". Peça a um
              administrador para conceder essa permissão ao seu cargo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : loadError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlert />
            </EmptyMedia>
            <EmptyTitle>Não foi possível carregar</EmptyTitle>
            <EmptyDescription>{loadError}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : metricas === null ? (
        <Skeleton className="h-90 w-full" />
      ) : metricas.total_gestantes === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 />
            </EmptyMedia>
            <EmptyTitle>Sem dado suficiente</EmptyTitle>
            <EmptyDescription>
              Não há gestantes em acompanhamento nesta prefeitura para gerar o gráfico.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border p-4">
          <PraticasBarChart dados={[metricas]} />
        </div>
      )}
    </div>
  );
}
