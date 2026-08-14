import { useCallback, useEffect, useState } from "react";
import { BarChart3, Lock, ShieldAlert } from "lucide-react";
import { PraticasBarChart } from "@/components/analytics/praticas-bar-chart";
import { PraticasPieChart } from "@/components/analytics/praticas-pie-chart";
import { PraticasRadarChart } from "@/components/analytics/praticas-radar-chart";
import { PrefeiturasRankingChart } from "@/components/analytics/prefeituras-ranking-chart";
import { EvolucaoLineChart } from "@/components/analytics/evolucao-line-chart";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import type { MetricasIndicadorOut, PrefeituraOut } from "@/lib/api-types";
import type { SerieHistoricaPrefeitura } from "@/lib/analytics-chart-data";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";

type TipoGrafico = "barra" | "pizza" | "radar" | "ranking" | "evolucao";

export function AnalyticsPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);

  // Visão única (Fase A): uma prefeitura selecionada por vez.
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Comparação (Fase B): 2+ prefeituras marcadas via checkbox.
  const [comparando, setComparando] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [dados, setDados] = useState<MetricasIndicadorOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Troca só o componente renderizado — não re-busca dado, os 3 tipos de
  // gráfico consomem o mesmo `dados` já carregado.
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barra");
  const [historico, setHistorico] = useState<SerieHistoricaPrefeitura[] | null>(null);
  const [historicoKey, setHistoricoKey] = useState("");
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  useEffect(() => {
    prefeiturasService
      .list()
      .then((data) => {
        setPrefeituras(data);
        const primeiraAtiva = data.find((p) => p.active) ?? data[0];
        if (primeiraAtiva) {
          setSelectedId(primeiraAtiva.id);
          setSelectedIds(new Set([primeiraAtiva.id]));
        }
      })
      .catch(() => setPrefeituras([]));
  }, []);

  const carregar = useCallback(async () => {
    const ids = comparando ? [...selectedIds] : selectedId !== null ? [selectedId] : [];
    if (ids.length === 0) {
      setDados([]);
      return;
    }
    try {
      const resultado = comparando
        ? await gestanteService.comparar(ids)
        : [await gestanteService.metricas(ids[0])];
      setDados(resultado);
      setLoadError(null);
      setForbidden(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
        setDados(null);
        setLoadError(null);
        return;
      }
      setForbidden(false);
      setLoadError(
        err instanceof ApiError ? err.detail : "Não foi possível carregar as métricas.",
      );
    }
  }, [comparando, selectedId, selectedIds]);

  useEffect(() => {
    setDados(null);
    setForbidden(false);
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (tipoGrafico !== "evolucao" || prefeituras === null) return;
    const ids = comparando ? [...selectedIds].toSorted((a, b) => a - b) : selectedId ? [selectedId] : [];
    const chave = ids.join(",");
    if (chave === historicoKey) return;
    if (ids.length === 0) {
      setHistorico([]);
      setHistoricoKey(chave);
      return;
    }
    setHistorico(null);
    setHistoricoError(null);
    Promise.all(
      ids.map(async (id) => ({
        prefeitura_id: id,
        prefeitura_nome: prefeituras.find((item) => item.id === id)?.name ?? String(id),
        pontos: await gestanteService.serieHistorica(id),
      })),
    )
      .then((series) => {
        setHistorico(series);
        setHistoricoKey(chave);
      })
      .catch((erro) => {
        setHistoricoError(
          erro instanceof ApiError ? erro.detail : "Não foi possível carregar o histórico.",
        );
        setHistorico([]);
      });
  }, [comparando, historicoKey, prefeituras, selectedId, selectedIds, tipoGrafico]);

  const toggleSelecionada = (prefeituraId: number, marcada: boolean) => {
    setSelectedIds((atual) => {
      const proximo = new Set(atual);
      if (marcada) proximo.add(prefeituraId);
      else proximo.delete(prefeituraId);
      return proximo;
    });
  };

  const totalGestantes = dados?.reduce((soma, item) => soma + item.total_gestantes, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Indicador C3 (Gestantes) — % de cumprimento por prática, filtrado por prefeitura."
      />

      <div className="mb-4 flex items-center gap-2">
        <Switch
          checked={comparando}
          onCheckedChange={setComparando}
          aria-label="Comparar entre prefeituras"
        />
        <span className="text-sm text-foreground">Comparar entre prefeituras</span>
      </div>

      <div className="mb-4 max-w-xs">
        {prefeituras === null ? (
          <Skeleton className="h-9 w-full" />
        ) : comparando ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            {prefeituras.map((prefeitura) => (
              <label
                key={prefeitura.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  checked={selectedIds.has(prefeitura.id)}
                  onCheckedChange={(checked) =>
                    toggleSelecionada(prefeitura.id, checked === true)
                  }
                />
                {prefeitura.name}
              </label>
            ))}
          </div>
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
      ) : dados === null ? (
        <Skeleton className="h-90 w-full" />
      ) : dados.length === 0 || totalGestantes === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 />
            </EmptyMedia>
            <EmptyTitle>Sem dado suficiente</EmptyTitle>
            <EmptyDescription>
              {comparando
                ? "Selecione ao menos uma prefeitura com gestantes em acompanhamento."
                : "Não há gestantes em acompanhamento nesta prefeitura para gerar o gráfico."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="mb-4">
            <Tabs
              value={tipoGrafico}
              onValueChange={(value) => setTipoGrafico(value as TipoGrafico)}
            >
              <TabsList>
                <TabsTrigger value="barra">Barra</TabsTrigger>
                <TabsTrigger value="pizza">Pizza</TabsTrigger>
                {dados.length > 1 ? <TabsTrigger value="radar">Radar</TabsTrigger> : null}
                <TabsTrigger value="ranking">Ranking</TabsTrigger>
                <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="rounded-lg border p-4">
            {tipoGrafico === "barra" ? (
              <PraticasBarChart dados={dados} />
            ) : tipoGrafico === "pizza" ? (
              <PraticasPieChart dados={dados} />
            ) : tipoGrafico === "ranking" ? (
              <PrefeiturasRankingChart dados={dados} />
            ) : tipoGrafico === "evolucao" ? (
              historicoError ? (
                <p className="text-sm text-destructive">{historicoError}</p>
              ) : historico === null ? (
                <Skeleton className="h-95 w-full" />
              ) : (
                <EvolucaoLineChart series={historico} />
              )
            ) : dados.length > 1 ? (
              <PraticasRadarChart dados={dados} />
            ) : (
              <p className="text-sm text-muted-foreground">
                O gráfico de radar compara 2 ou mais prefeituras. Ative "Comparar entre
                prefeituras" e selecione pelo menos duas para visualizá-lo.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
