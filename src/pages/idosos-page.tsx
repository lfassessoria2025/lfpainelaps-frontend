import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { CalendarClock, Download, Loader2, Search, ShieldAlert } from "lucide-react";
import { FechamentoC6 } from "@/components/idosos/fechamento-c6";
import { CatalogFilterChips } from "@/components/gestantes/catalog-filter-chips";
import { CatalogFilterDropdown } from "@/components/gestantes/catalog-filter-dropdown";
import { IndicatorPagination } from "@/components/indicators/indicator-pagination";
import { IndicatorFilterField, IndicatorToolbar } from "@/components/indicators/indicator-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";
import type { EquipeIdosoOut, FechamentoC6Out, IdosoAcompanhamentoOut, MicroAreaIdosoOut, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";
import { idosoService } from "@/services/idoso";
import { prefeiturasService } from "@/services/prefeituras";

type Pratica = "A" | "B" | "C" | "D";
type StatusFiltro = "todos" | "completo" | "pendente";
type Visao = "acompanhamento" | "fechamento";
const ITENS_POR_PAGINA = 20;
const PRATICAS: ReadonlyArray<{ codigo: Pratica; titulo: string }> = [
  { codigo: "A", titulo: "Consulta médica ou de enfermagem" },
  { codigo: "B", titulo: "Peso e altura no mesmo dia" },
  { codigo: "C", titulo: "Duas visitas de ACS/TACS" },
  { codigo: "D", titulo: "Vacinação contra influenza" },
];

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function situacao(idoso: IdosoAcompanhamentoOut, pratica: Pratica) {
  if (pratica === "A") return { concluida: idoso.pratica_a_consulta, detalhe: idoso.pratica_a_evidencia_data ? `Em ${formatarData(idoso.pratica_a_evidencia_data)}` : null };
  if (pratica === "B") return { concluida: idoso.pratica_b_peso_altura, detalhe: null };
  if (pratica === "C") return { concluida: idoso.pratica_c_visitas, detalhe: idoso.pratica_c_automatica_eap ? "Automática para eAP" : idoso.pratica_c_primeira_visita_data && idoso.pratica_c_segunda_visita_data ? `${formatarData(idoso.pratica_c_primeira_visita_data)} e ${formatarData(idoso.pratica_c_segunda_visita_data)}` : null };
  return { concluida: idoso.pratica_d_influenza, detalhe: idoso.pratica_d_evidencia_data ? `Em ${formatarData(idoso.pratica_d_evidencia_data)}` : null };
}

function PraticaStatus({ idoso, pratica }: { idoso: IdosoAcompanhamentoOut; pratica: Pratica }) {
  const estado = situacao(idoso, pratica);
  return <div className="flex min-w-28 flex-col items-center gap-1 text-center"><Badge variant={estado.concluida ? "default" : "secondary"}>{estado.concluida ? "Concluída" : "Pendente"}</Badge>{estado.detalhe ? <span className="text-[10px] text-muted-foreground">{estado.detalhe}</span> : null}</div>;
}

export function IdososPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | null>(null);
  const [idosos, setIdosos] = useState<IdosoAcompanhamentoOut[] | null>(null);
  const [equipes, setEquipes] = useState<EquipeIdosoOut[] | null>(null);
  const [microAreas, setMicroAreas] = useState<MicroAreaIdosoOut[] | null>(null);
  const [equipesSelecionadas, setEquipesSelecionadas] = useState<string[]>([]);
  const [microAreasSelecionadas, setMicroAreasSelecionadas] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const buscaDeferred = useDeferredValue(busca);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [visao, setVisao] = useState<Visao>("acompanhamento");
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [proibido, setProibido] = useState(false);
  const [fechamento, setFechamento] = useState<FechamentoC6Out | null>(null);
  const [erroFechamento, setErroFechamento] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const { dragging, containerProps } = useHorizontalDrag();

  useEffect(() => {
    prefeiturasService.list().then((lista) => {
      setPrefeituras(lista);
      setPrefeituraId((lista.find((item) => item.active) ?? lista[0])?.id ?? null);
    }).catch(() => setPrefeituras([]));
  }, []);

  const atualizarEquipes = useCallback((valores: string[]) => setEquipesSelecionadas([...new Set(valores)].toSorted()), []);
  const atualizarMicroAreas = useCallback((valores: string[]) => setMicroAreasSelecionadas([...new Set(valores)].toSorted()), []);

  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setEquipes(null);
    setMicroAreas(null);
    Promise.all([
      idosoService.equipes(prefeituraId, controller.signal),
      idosoService.microAreas(prefeituraId, controller.signal),
    ]).then(([novasEquipes, novasMicroAreas]) => {
      setEquipes(novasEquipes);
      setMicroAreas(novasMicroAreas);
    }).catch(() => { setEquipes([]); setMicroAreas([]); });
    return () => controller.abort();
  }, [prefeituraId]);

  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setIdosos(null); setErro(null); setProibido(false);
    idosoService.list(prefeituraId, equipesSelecionadas, microAreasSelecionadas, controller.signal)
      .then(setIdosos)
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        if (falha instanceof ApiError && falha.status === 403) setProibido(true);
        else setErro(falha instanceof ApiError ? falha.detail : "Não foi possível carregar as pessoas idosas.");
      });
    return () => controller.abort();
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId]);

  useEffect(() => {
    if (visao !== "fechamento" || prefeituraId === null) return;
    const controller = new AbortController();
    setFechamento(null); setErroFechamento(null);
    idosoService.fechamento(prefeituraId, equipesSelecionadas, microAreasSelecionadas, controller.signal)
      .then(setFechamento)
      .catch((falha: unknown) => setErroFechamento(falha instanceof ApiError ? falha.detail : "Não foi possível carregar o fechamento C6."));
    return () => controller.abort();
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId, visao]);

  const filtrados = useMemo(() => {
    if (!idosos) return [];
    const termo = buscaDeferred.trim().toLocaleLowerCase("pt-BR");
    return idosos.filter((idoso) => {
      const corresponde = !termo || idoso.nome_cidadao.toLocaleLowerCase("pt-BR").includes(termo) || (idoso.equipe_nome ?? "").toLocaleLowerCase("pt-BR").includes(termo);
      const status = idoso.pontos_obtidos === 100 ? "completo" : "pendente";
      return corresponde && (statusFiltro === "todos" || statusFiltro === status);
    }).toSorted((a, b) => a.nome_cidadao.localeCompare(b.nome_cidadao, "pt-BR"));
  }, [buscaDeferred, idosos, statusFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const daPagina = filtrados.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);
  useEffect(() => setPagina(1), [buscaDeferred, equipesSelecionadas, microAreasSelecionadas, statusFiltro]);

  const exportar = useCallback(async () => {
    if (prefeituraId === null) return;
    setExportando(true);
    setErro(null);
    try {
      const { blob, filename } = await idosoService.exportar(
        prefeituraId,
        equipesSelecionadas,
        microAreasSelecionadas,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (falha: unknown) {
      setErro(falha instanceof ApiError ? falha.detail : "Não foi possível baixar a planilha de pessoas idosas.");
    } finally {
      setExportando(false);
    }
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId]);

  if (proibido) return <Empty><EmptyHeader><EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia><EmptyTitle>Sem permissão para ver este indicador</EmptyTitle><EmptyDescription>Você não tem a permissão “Visualizar indicador de pessoas idosas (C6)”.</EmptyDescription></EmptyHeader></Empty>;

  return (
    <div className="min-w-0">
      <IndicatorToolbar
        municipality={<IndicatorFilterField label="Prefeitura">{prefeituras === null ? <Skeleton className="h-8" /> : <Select value={prefeituraId ? String(prefeituraId) : undefined} onValueChange={(valor) => { if (valor) { atualizarEquipes([]); atualizarMicroAreas([]); setPrefeituraId(Number(valor)); } }}><SelectTrigger aria-label="Prefeitura"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectGroup>{prefeituras.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select>}</IndicatorFilterField>}
        filters={prefeituraId !== null ? <><IndicatorFilterField label="Buscar" className="sm:col-span-2"><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome ou equipe" className="pl-8" /></div></IndicatorFilterField><CatalogFilterDropdown label="Equipe" ariaLabel="Filtrar por equipe" groupLabel="Equipes" loadingLabel="Carregando equipes…" summaryLabel={equipesSelecionadas.length ? `${equipesSelecionadas.length} equipe(s)` : "Todas as equipes"} items={equipes} selectedKeys={equipesSelecionadas} getKey={(item) => item.chave} getPrimaryLabel={(item) => item.sem_equipe ? "Sem equipe" : item.nome ?? "Equipe sem nome"} getSecondaryLabel={(item) => `${item.ine ? `INE ${item.ine}` : "Sem INE"} · ${item.total_idosos} pessoa(s)`} onToggle={(chave, selecionada) => atualizarEquipes(selecionada ? [...equipesSelecionadas, chave] : equipesSelecionadas.filter((item) => item !== chave))} /><CatalogFilterDropdown label="Micro-área" ariaLabel="Filtrar por micro-área" groupLabel="Micro-áreas" loadingLabel="Carregando micro-áreas…" summaryLabel={microAreasSelecionadas.length ? `${microAreasSelecionadas.length} micro-área(s)` : "Todas as micro-áreas"} items={microAreas} selectedKeys={microAreasSelecionadas} getKey={(item) => item.chave} getPrimaryLabel={(item) => item.sem_micro_area ? "Sem micro-área" : item.codigo ?? ""} getSecondaryLabel={(item) => `${item.total_idosos} pessoa(s)`} onToggle={(chave, selecionada) => atualizarMicroAreas(selecionada ? [...microAreasSelecionadas, chave] : microAreasSelecionadas.filter((item) => item !== chave))} /><IndicatorFilterField label="Status"><Select value={statusFiltro} onValueChange={(valor) => valor && setStatusFiltro(valor as StatusFiltro)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos</SelectItem><SelectItem value="completo">Completo</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectGroup></SelectContent></Select></IndicatorFilterField></> : undefined}
        summary={idosos ? <p className="text-xs text-muted-foreground"><strong className="text-foreground">{filtrados.length}</strong> de {idosos.length} pessoas idosas</p> : undefined}
        actions={visao === "acompanhamento" && idosos && idosos.length > 0 ? (
          <Button variant="outline" size="sm" disabled={exportando} onClick={() => void exportar()}>
            {exportando ? <Loader2 className="animate-spin" /> : <Download />}
            Baixar planilha
          </Button>
        ) : undefined}
        activeFilters={<><CatalogFilterChips selectedKeys={equipesSelecionadas} getLabel={(chave) => equipes?.find((item) => item.chave === chave)?.nome ?? chave} clearLabel="Limpar equipes" onClear={() => atualizarEquipes([])} /><CatalogFilterChips selectedKeys={microAreasSelecionadas} getLabel={(chave) => microAreas?.find((item) => item.chave === chave)?.codigo ?? chave} clearLabel="Limpar micro-áreas" onClear={() => atualizarMicroAreas([])} /></>}
      />
      <Tabs value={visao} onValueChange={(valor) => setVisao(valor as Visao)} className="gap-3">
        <TabsList variant="line" aria-label="Visões do indicador de pessoas idosas"><TabsTrigger value="acompanhamento">Tabela de acompanhamento</TabsTrigger><TabsTrigger value="fechamento"><CalendarClock data-icon="inline-start" />Fechamento</TabsTrigger></TabsList>
        <TabsContent value="acompanhamento">
          {erro ? <p role="alert" className="mb-3 text-sm text-destructive">{erro}</p> : null}
          {idosos === null && !erro ? <Skeleton className="h-72" /> : idosos?.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Nenhuma pessoa idosa no recorte</EmptyTitle><EmptyDescription>O último processamento não trouxe pessoas elegíveis.</EmptyDescription></EmptyHeader></Empty> : idosos ? <><div className="grid gap-2 md:hidden">{daPagina.map((idoso) => <Card key={idoso.id} className="gap-3 p-4"><div className="flex justify-between gap-2"><div><p className="font-medium">{idoso.nome_cidadao}</p><p className="text-xs text-muted-foreground">{idoso.equipe_nome ?? "Sem equipe"}</p></div><span className="font-medium">{idoso.pontos_obtidos}/100</span></div><div className="grid grid-cols-2 gap-2">{PRATICAS.map((pratica) => <div key={pratica.codigo} className="rounded-md border p-2"><p className="mb-1 text-center text-xs font-semibold">Prática {pratica.codigo}</p><PraticaStatus idoso={idoso} pratica={pratica.codigo} /></div>)}</div></Card>)}</div><Card className="hidden min-w-0 overflow-hidden py-0 md:block"><Table className="min-w-[1050px] text-xs" containerClassName={cn("cursor-grab", dragging && "cursor-grabbing select-none")} containerProps={{ ...containerProps, role: "region", "aria-label": "Tabela nominal de pessoas idosas" }}><TableHeader><TableRow><TableHead className="sticky left-0 z-[2] min-w-48 bg-muted">Pessoa</TableHead><TableHead>Equipe</TableHead><TableHead>Micro-área</TableHead><TableHead>Nascimento</TableHead>{PRATICAS.map((pratica) => <TableHead key={pratica.codigo} className="min-w-40 text-center">Prática {pratica.codigo}<span className="block text-[10px] text-muted-foreground">{pratica.titulo}</span></TableHead>)}<TableHead className="text-right">Pontuação</TableHead><TableHead>Referência</TableHead></TableRow></TableHeader><TableBody>{daPagina.map((idoso) => <TableRow key={idoso.id}><TableCell className="sticky left-0 z-[1] bg-background font-medium">{idoso.nome_cidadao}</TableCell><TableCell>{idoso.equipe_nome ?? "Sem equipe"}</TableCell><TableCell>{idoso.micro_area ?? "Sem micro-área"}</TableCell><TableCell>{formatarData(idoso.data_nascimento)}</TableCell>{PRATICAS.map((pratica) => <TableCell key={pratica.codigo}><PraticaStatus idoso={idoso} pratica={pratica.codigo} /></TableCell>)}<TableCell className="text-right font-medium">{idoso.pontos_obtidos}/100</TableCell><TableCell>{formatarData(idoso.data_referencia)}</TableCell></TableRow>)}</TableBody></Table></Card><IndicatorPagination currentPage={paginaAtual} totalPages={totalPaginas} onChange={setPagina} ariaLabel="Paginação de pessoas idosas" /></> : null}
        </TabsContent>
        <TabsContent value="fechamento">{erroFechamento ? <p role="alert" className="text-sm text-destructive">{erroFechamento}</p> : fechamento ? <FechamentoC6 dados={fechamento} /> : <Skeleton className="h-72" />}</TabsContent>
      </Tabs>
    </div>
  );
}
