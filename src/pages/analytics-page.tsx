import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ChartNoAxesCombined, Lock, ShieldAlert, TableProperties } from "lucide-react";
import { EvolucaoLineChart } from "@/components/analytics/evolucao-line-chart";
import { PraticasBarChart } from "@/components/analytics/praticas-bar-chart";
import { PraticasPieChart } from "@/components/analytics/praticas-pie-chart";
import { PraticasRadarChart } from "@/components/analytics/praticas-radar-chart";
import { PrefeiturasRankingChart } from "@/components/analytics/prefeituras-ranking-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IndicadorCatalogoOut, MetricasIndicadorOut, PrefeituraOut, VisualizacaoIndicador } from "@/lib/api-types";
import type { SerieHistoricaPrefeitura } from "@/lib/analytics-chart-data";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { indicadoresService } from "@/services/indicadores";
import { prefeiturasService } from "@/services/prefeituras";

type Secao = "visao-geral" | "visualizacoes" | "tabela";

const SECOES = new Set<Secao>(["visao-geral", "visualizacoes", "tabela"]);
const GRAFICOS = new Set<VisualizacaoIndicador>(["barra", "pizza", "radar", "ranking", "evolucao"]);

function lerQueryInicial() {
  const query = new URLSearchParams(window.location.search);
  const ids = query.get("prefeituras")?.split(",").map(Number).filter(Number.isSafeInteger) ?? [];
  const secao = query.get("secao") as Secao;
  const grafico = query.get("grafico") as VisualizacaoIndicador;
  return {
    codigo: query.get("indicador"),
    ids,
    comparando: query.get("comparar") === "1",
    secao: SECOES.has(secao) ? secao : "visao-geral" as Secao,
    grafico: GRAFICOS.has(grafico) ? grafico : "barra" as VisualizacaoIndicador,
  };
}

export function AnalyticsPage() {
  const queryInicial = useMemo(lerQueryInicial, []);
  const [catalogo, setCatalogo] = useState<IndicadorCatalogoOut[] | null>(null);
  const [indicadorCodigo, setIndicadorCodigo] = useState(queryInicial.codigo);
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(queryInicial.ids[0] ?? null);
  const [comparando, setComparando] = useState(queryInicial.comparando);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(queryInicial.ids));
  const [secao, setSecao] = useState<Secao>(queryInicial.secao);
  const [tipoGrafico, setTipoGrafico] = useState<VisualizacaoIndicador>(queryInicial.grafico);
  const [dados, setDados] = useState<MetricasIndicadorOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [historico, setHistorico] = useState<SerieHistoricaPrefeitura[] | null>(null);
  const [historicoKey, setHistoricoKey] = useState("");
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  const indicador = catalogo?.find((item) => item.codigo === indicadorCodigo) ?? catalogo?.[0];
  const visualizacoes = indicador?.visualizacoes ?? [];

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      indicadoresService.catalogo(controller.signal),
      prefeiturasService.list(controller.signal),
    ]).then(([catalogoResposta, prefeiturasResposta]) => {
      setCatalogo(catalogoResposta.indicadores);
      const codigoValido = catalogoResposta.indicadores.some((item) => item.codigo === indicadorCodigo);
      if (!codigoValido) setIndicadorCodigo(catalogoResposta.indicadores[0]?.codigo ?? null);
      setPrefeituras(prefeiturasResposta);
      const idsValidos = new Set(prefeiturasResposta.map((item) => item.id));
      const idsSelecionados = [...selectedIds].filter((id) => idsValidos.has(id));
      const primeiraAtiva = prefeiturasResposta.find((item) => item.active) ?? prefeiturasResposta[0];
      if (idsSelecionados.length === 0 && primeiraAtiva) idsSelecionados.push(primeiraAtiva.id);
      setSelectedIds(new Set(idsSelecionados));
      setSelectedId(idsSelecionados[0] ?? null);
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCatalogo([]);
      setPrefeituras([]);
      setLoadError("Não foi possível carregar os filtros do Analytics.");
    });
    return () => controller.abort();
  // A query inicial é deliberadamente lida uma vez; mudanças seguintes são estado local.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (indicadorCodigo) query.set("indicador", indicadorCodigo);
    const ids = comparando ? [...selectedIds].toSorted((a, b) => a - b) : selectedId ? [selectedId] : [];
    if (ids.length > 0) query.set("prefeituras", ids.join(","));
    if (comparando) query.set("comparar", "1");
    query.set("secao", secao);
    if (secao === "visualizacoes") query.set("grafico", tipoGrafico);
    window.history.replaceState(null, "", `${window.location.pathname}?${query.toString()}`);
  }, [comparando, indicadorCodigo, secao, selectedId, selectedIds, tipoGrafico]);

  const carregar = useCallback(async () => {
    if (!indicador) return;
    const ids = comparando ? [...selectedIds] : selectedId !== null ? [selectedId] : [];
    if (ids.length === 0) { setDados([]); return; }
    try {
      const resultado = comparando ? await gestanteService.comparar(ids) : [await gestanteService.metricas(ids[0])];
      setDados(resultado); setLoadError(null); setForbidden(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setForbidden(true); setDados(null); setLoadError(null); return;
      }
      setForbidden(false);
      setLoadError(error instanceof ApiError ? error.detail : "Não foi possível carregar as métricas.");
    }
  }, [comparando, indicador, selectedId, selectedIds]);

  useEffect(() => { setDados(null); setForbidden(false); void carregar(); }, [carregar]);

  useEffect(() => {
    if (secao !== "visualizacoes" || tipoGrafico !== "evolucao" || prefeituras === null) return;
    const ids = comparando ? [...selectedIds].toSorted((a, b) => a - b) : selectedId ? [selectedId] : [];
    const chave = ids.join(",");
    if (chave === historicoKey) return;
    if (ids.length === 0) { setHistorico([]); setHistoricoKey(chave); return; }
    setHistorico(null); setHistoricoError(null);
    Promise.all(ids.map(async (id) => ({
      prefeitura_id: id,
      prefeitura_nome: prefeituras.find((item) => item.id === id)?.name ?? String(id),
      pontos: await gestanteService.serieHistorica(id),
    }))).then((series) => { setHistorico(series); setHistoricoKey(chave); })
      .catch((error) => { setHistoricoError(error instanceof ApiError ? error.detail : "Não foi possível carregar o histórico."); setHistorico([]); });
  }, [comparando, historicoKey, prefeituras, secao, selectedId, selectedIds, tipoGrafico]);

  const toggleSelecionada = (id: number, marcada: boolean) => setSelectedIds((atual) => {
    const proximo = new Set(atual); if (marcada) proximo.add(id); else proximo.delete(id); return proximo;
  });
  const totalGestantes = dados?.reduce((soma, item) => soma + item.total_gestantes, 0) ?? 0;

  return <div className="flex flex-col gap-6">
    <PageHeader title="Analytics" description="Explore, compare e detalhe os indicadores de saúde disponíveis." />

    <Card>
      <CardHeader>
        <CardTitle>Filtros da análise</CardTitle>
        <CardDescription>Escolha o indicador e o recorte. Seus filtros ficam salvos no endereço da página.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(16rem,2fr)]">
        <label className="flex flex-col gap-2 text-sm font-medium">Tipo de indicador
          {catalogo === null ? <Skeleton className="h-9 w-full" /> : <Select value={indicador?.codigo} onValueChange={setIndicadorCodigo}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione um indicador" /></SelectTrigger>
            <SelectContent><SelectGroup>{catalogo.map((item) => <SelectItem key={item.codigo} value={item.codigo}>{item.nome}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>}
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4"><span className="text-sm font-medium">Prefeituras</span><label className="flex items-center gap-2 text-sm"><Switch checked={comparando} onCheckedChange={setComparando} aria-label="Comparar entre prefeituras" />Comparar</label></div>
          {prefeituras === null ? <Skeleton className="h-9 w-full" /> : comparando ? <div className="grid max-h-32 gap-2 overflow-auto rounded-lg border p-3 sm:grid-cols-2">
            {prefeituras.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(checked) => toggleSelecionada(item.id, checked === true)} />{item.name}</label>)}
          </div> : <Select value={selectedId ? String(selectedId) : undefined} onValueChange={(value) => value && setSelectedId(Number(value))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a prefeitura" /></SelectTrigger>
            <SelectContent><SelectGroup>{prefeituras.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>}
        </div>
      </CardContent>
    </Card>

    {indicador ? <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-xl font-semibold">{indicador.nome}</h2><Badge variant="secondary">{indicador.codigo.toUpperCase()}</Badge></div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{indicador.descricao}</p></div><Badge variant="outline">{indicador.categoria}</Badge></div> : null}

    <Tabs value={secao} onValueChange={(value) => setSecao(value as Secao)}><TabsList variant="line" className="w-full justify-start overflow-x-auto"><TabsTrigger value="visao-geral"><ChartNoAxesCombined data-icon="inline-start" />Visão geral</TabsTrigger><TabsTrigger value="visualizacoes"><BarChart3 data-icon="inline-start" />Visualizações</TabsTrigger><TabsTrigger value="tabela"><TableProperties data-icon="inline-start" />Tabela</TabsTrigger></TabsList></Tabs>

    {prefeituras !== null && prefeituras.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre uma prefeitura para visualizar o Analytics.</p>
    : forbidden ? <Empty><EmptyHeader><EmptyMedia variant="icon"><Lock /></EmptyMedia><EmptyTitle>Sem permissão para ver este indicador</EmptyTitle><EmptyDescription>Peça a um administrador acesso ao indicador selecionado.</EmptyDescription></EmptyHeader></Empty>
    : loadError ? <Empty><EmptyHeader><EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia><EmptyTitle>Não foi possível carregar</EmptyTitle><EmptyDescription>{loadError}</EmptyDescription></EmptyHeader></Empty>
    : dados === null || catalogo === null ? <Skeleton className="h-90 w-full" />
    : dados.length === 0 || totalGestantes === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><BarChart3 /></EmptyMedia><EmptyTitle>Sem dado suficiente</EmptyTitle><EmptyDescription>{comparando ? "Selecione ao menos uma prefeitura com dados." : "Não há dados nesta prefeitura para gerar a análise."}</EmptyDescription></EmptyHeader></Empty>
    : secao === "visao-geral" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Card><CardHeader><CardDescription>Total acompanhado</CardDescription><CardTitle className="text-3xl">{totalGestantes.toLocaleString("pt-BR")}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Parâmetros monitorados</CardDescription><CardTitle className="text-3xl">{indicador?.parametros.length ?? 0}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Prefeituras no recorte</CardDescription><CardTitle className="text-3xl">{dados.length}</CardTitle></CardHeader></Card><Card className="sm:col-span-2 lg:col-span-3"><CardHeader><CardTitle>Cumprimento por parâmetro</CardTitle><CardDescription>Visão rápida do desempenho no recorte selecionado.</CardDescription></CardHeader><CardContent><PraticasBarChart dados={dados} /></CardContent></Card></div>
    : secao === "tabela" ? <Card><CardHeader><CardTitle>Todos os parâmetros</CardTitle><CardDescription>Metas, totais e percentuais lado a lado para facilitar leitura e comparação.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Parâmetro</TableHead><TableHead>Descrição</TableHead><TableHead>Meta</TableHead>{dados.map((item) => <TableHead key={item.prefeitura_id}>{item.prefeitura_nome}</TableHead>)}</TableRow></TableHeader><TableBody>{indicador?.parametros.map((parametro) => <TableRow key={parametro.codigo}><TableCell className="font-medium">{parametro.rotulo}</TableCell><TableCell className="min-w-60 text-muted-foreground">{parametro.descricao}</TableCell><TableCell>{parametro.meta === null ? "—" : parametro.tipo === "booleano" ? parametro.meta > 0 ? "Sim" : "Não" : parametro.meta}</TableCell>{dados.map((item) => { const metrica = item.praticas.find((pratica) => pratica.pratica.toLowerCase() === parametro.codigo.toLowerCase()); return <TableCell key={item.prefeitura_id}>{metrica ? <div className="flex flex-col"><span className="font-medium">{metrica.percentual_cumprido.toLocaleString("pt-BR")}%</span><span className="text-xs text-muted-foreground">{metrica.total_cumprida}/{metrica.total_gestantes}</span></div> : "—"}</TableCell>; })}</TableRow>)}</TableBody></Table></CardContent></Card>
    : <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]"><Card><CardHeader><CardTitle>Galeria de gráficos</CardTitle><CardDescription>Alterne a leitura sem buscar as métricas novamente.</CardDescription></CardHeader><CardContent><Tabs value={tipoGrafico} onValueChange={(value) => setTipoGrafico(value as VisualizacaoIndicador)} orientation="vertical"><TabsList variant="line" className="w-full">{visualizacoes.map((item) => <TabsTrigger key={item} value={item} disabled={item === "radar" && dados.length < 2} className="capitalize">{item === "evolucao" ? "Evolução" : item}</TabsTrigger>)}</TabsList></Tabs></CardContent></Card><Card><CardHeader><CardTitle>{tipoGrafico === "evolucao" ? "Evolução histórica" : `Gráfico de ${tipoGrafico}`}</CardTitle><CardDescription>Resultado agregado do recorte selecionado.</CardDescription></CardHeader><CardContent>{tipoGrafico === "barra" ? <PraticasBarChart dados={dados} /> : tipoGrafico === "pizza" ? <PraticasPieChart dados={dados} /> : tipoGrafico === "ranking" ? <PrefeiturasRankingChart dados={dados} /> : tipoGrafico === "evolucao" ? historicoError ? <p className="text-sm text-destructive">{historicoError}</p> : historico === null ? <Skeleton className="h-95 w-full" /> : <EvolucaoLineChart series={historico} /> : dados.length > 1 ? <PraticasRadarChart dados={dados} /> : <p className="text-sm text-muted-foreground">Selecione duas ou mais prefeituras para usar o radar.</p>}</CardContent></Card></div>}
  </div>;
}
