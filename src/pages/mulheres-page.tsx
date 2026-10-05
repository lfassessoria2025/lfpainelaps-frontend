import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { CalendarClock, Download, Loader2, Search, ShieldAlert } from "lucide-react";
import { FechamentoC7 } from "@/components/mulheres/fechamento-c7";
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
import type {
  EquipeMulherOut,
  FechamentoC7Out,
  MicroAreaMulherOut,
  MulherAcompanhamentoOut,
  PrefeituraOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";
import { mulherService } from "@/services/mulher";
import { prefeiturasService } from "@/services/prefeituras";

type Pratica = "A" | "B" | "C" | "D";
type StatusFiltro = "todos" | "completa" | "pendente";
type Ordenacao = "nome" | "pontuacao-desc" | "pontuacao-asc";
type Visao = "acompanhamento" | "fechamento";

const ITENS_POR_PAGINA = 20;
const PRATICAS: ReadonlyArray<{ codigo: Pratica; titulo: string }> = [
  { codigo: "A", titulo: "Rastreamento do colo do útero" },
  { codigo: "B", titulo: "Vacinação contra HPV" },
  { codigo: "C", titulo: "Saúde sexual e reprodutiva" },
  { codigo: "D", titulo: "Rastreamento do câncer de mama" },
];

interface SituacaoPratica {
  aplicavel: boolean;
  concluida: boolean;
  evidencia: string | null;
  validaAte: string | null;
}

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function praticaDaMulher(mulher: MulherAcompanhamentoOut, pratica: Pratica): SituacaoPratica {
  if (pratica === "A") return { aplicavel: mulher.pratica_a_aplicavel, concluida: mulher.pratica_a_concluida, evidencia: mulher.pratica_a_evidencia_data, validaAte: mulher.pratica_a_valida_ate };
  if (pratica === "B") return { aplicavel: mulher.pratica_b_aplicavel, concluida: mulher.pratica_b_concluida, evidencia: mulher.pratica_b_evidencia_data, validaAte: null };
  if (pratica === "C") return { aplicavel: mulher.pratica_c_aplicavel, concluida: mulher.pratica_c_concluida, evidencia: mulher.pratica_c_evidencia_data, validaAte: mulher.pratica_c_valida_ate };
  return { aplicavel: mulher.pratica_d_aplicavel, concluida: mulher.pratica_d_concluida, evidencia: mulher.pratica_d_evidencia_data, validaAte: mulher.pratica_d_valida_ate };
}

function PraticaStatus({ mulher, pratica }: { mulher: MulherAcompanhamentoOut; pratica: Pratica }) {
  const situacao = praticaDaMulher(mulher, pratica);
  if (!situacao.aplicavel) return <Badge variant="outline">Não se aplica</Badge>;
  return (
    <div className="flex min-w-28 flex-col items-center gap-1 text-center">
      <Badge variant={situacao.concluida ? "default" : "secondary"}>
        {situacao.concluida ? "Concluída" : "Pendente"}
      </Badge>
      {situacao.evidencia ? <span className="text-[10px] text-muted-foreground">Evidência: {formatarData(situacao.evidencia)}</span> : null}
      {situacao.validaAte ? <span className="text-[10px] text-muted-foreground">Válida até: {formatarData(situacao.validaAte)}</span> : null}
    </div>
  );
}

function completa(mulher: MulherAcompanhamentoOut): boolean {
  return mulher.pontos_aplicaveis > 0 && mulher.pontos_obtidos === mulher.pontos_aplicaveis;
}

function Pontuacao({ mulher }: { mulher: MulherAcompanhamentoOut }) {
  return <span className="font-medium tabular-nums">{formatarNumero(mulher.pontos_obtidos)}/{formatarNumero(mulher.pontos_aplicaveis)}</span>;
}

export function MulheresPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | null>(null);
  const [mulheres, setMulheres] = useState<MulherAcompanhamentoOut[] | null>(null);
  const [equipes, setEquipes] = useState<EquipeMulherOut[] | null>(null);
  const [microAreas, setMicroAreas] = useState<MicroAreaMulherOut[] | null>(null);
  const [equipesSelecionadas, setEquipesSelecionadas] = useState<string[]>(() => [...new Set(new URLSearchParams(window.location.search).getAll("equipe"))].slice(0, 50));
  const [microAreasSelecionadas, setMicroAreasSelecionadas] = useState<string[]>(() => [...new Set(new URLSearchParams(window.location.search).getAll("micro_area"))].slice(0, 50));
  const [busca, setBusca] = useState("");
  const buscaDeferred = useDeferredValue(busca);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [pagina, setPagina] = useState(1);
  const [visao, setVisao] = useState<Visao>("acompanhamento");
  const [erro, setErro] = useState<string | null>(null);
  const [proibido, setProibido] = useState(false);
  const [fechamento, setFechamento] = useState<FechamentoC7Out | null>(null);
  const [erroFechamento, setErroFechamento] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const { dragging, containerProps } = useHorizontalDrag();

  useEffect(() => {
    prefeiturasService.list().then((lista) => {
      setPrefeituras(lista);
      setPrefeituraId((lista.find((item) => item.active) ?? lista[0])?.id ?? null);
    }).catch(() => setPrefeituras([]));
  }, []);

  const sincronizarUrl = useCallback((chave: "equipe" | "micro_area", valores: string[]) => {
    const url = new URL(window.location.href);
    url.searchParams.delete(chave);
    valores.forEach((valor) => url.searchParams.append(chave, valor));
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const atualizarEquipes = useCallback((valores: string[]) => {
    const unicos = [...new Set(valores)].toSorted();
    setEquipesSelecionadas(unicos);
    sincronizarUrl("equipe", unicos);
  }, [sincronizarUrl]);

  const atualizarMicroAreas = useCallback((valores: string[]) => {
    const unicos = [...new Set(valores)].toSorted();
    setMicroAreasSelecionadas(unicos);
    sincronizarUrl("micro_area", unicos);
  }, [sincronizarUrl]);

  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setEquipes(null);
    setMicroAreas(null);
    Promise.all([
      mulherService.equipes(prefeituraId, controller.signal),
      mulherService.microAreas(prefeituraId, controller.signal),
    ]).then(([listaEquipes, listaMicroAreas]) => {
      setEquipes(listaEquipes);
      setMicroAreas(listaMicroAreas);
    }).catch((falha: unknown) => {
      if (falha instanceof DOMException && falha.name === "AbortError") return;
      setEquipes([]);
      setMicroAreas([]);
    });
    return () => controller.abort();
  }, [prefeituraId]);

  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setMulheres(null);
    setErro(null);
    setProibido(false);
    mulherService.list(prefeituraId, equipesSelecionadas, microAreasSelecionadas, controller.signal)
      .then(setMulheres)
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        if (falha instanceof ApiError && falha.status === 403) {
          setProibido(true);
          return;
        }
        setErro(falha instanceof ApiError ? falha.detail : "Não foi possível carregar as mulheres.");
      });
    return () => controller.abort();
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId]);

  useEffect(() => {
    if (visao !== "fechamento" || prefeituraId === null) return;
    const controller = new AbortController();
    setFechamento(null);
    setErroFechamento(null);
    mulherService.fechamento(prefeituraId, equipesSelecionadas, microAreasSelecionadas, controller.signal)
      .then(setFechamento)
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        setErroFechamento(falha instanceof ApiError ? falha.detail : "Não foi possível carregar o fechamento C7.");
      });
    return () => controller.abort();
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId, visao]);

  const filtradas = useMemo(() => {
    if (!mulheres) return [];
    const termo = buscaDeferred.trim().toLocaleLowerCase("pt-BR");
    return mulheres.filter((mulher) => {
      const corresponde = !termo || mulher.nome_cidadao.toLocaleLowerCase("pt-BR").includes(termo) || (mulher.equipe_nome ?? "").toLocaleLowerCase("pt-BR").includes(termo) || (mulher.micro_area ?? "").toLocaleLowerCase("pt-BR").includes(termo);
      const status = completa(mulher) ? "completa" : "pendente";
      return corresponde && (statusFiltro === "todos" || statusFiltro === status);
    }).toSorted((a, b) => {
      if (ordenacao === "pontuacao-desc") return b.pontos_obtidos - a.pontos_obtidos;
      if (ordenacao === "pontuacao-asc") return a.pontos_obtidos - b.pontos_obtidos;
      return a.nome_cidadao.localeCompare(b.nome_cidadao, "pt-BR");
    });
  }, [buscaDeferred, mulheres, ordenacao, statusFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioDaPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const daPagina = filtradas.slice(inicioDaPagina, inicioDaPagina + ITENS_POR_PAGINA);

  useEffect(() => setPagina(1), [buscaDeferred, equipesSelecionadas, microAreasSelecionadas, ordenacao, statusFiltro]);

  const exportar = useCallback(async () => {
    if (prefeituraId === null) return;
    setExportando(true);
    setErro(null);
    try {
      const { blob, filename } = await mulherService.exportar(
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
      setErro(falha instanceof ApiError ? falha.detail : "Não foi possível baixar a planilha de mulheres.");
    } finally {
      setExportando(false);
    }
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId]);

  if (proibido) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>Sem permissão para ver este indicador</EmptyTitle>
          <EmptyDescription>Você não tem a permissão “Visualizar indicador de mulheres (C7)”.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="min-w-0">
      <IndicatorToolbar
        municipality={
          <IndicatorFilterField label="Prefeitura">
            {prefeituras === null ? <Skeleton className="h-8" /> : (
              <Select value={prefeituraId ? String(prefeituraId) : undefined} onValueChange={(valor) => {
                if (!valor) return;
                atualizarEquipes([]);
                atualizarMicroAreas([]);
                setPrefeituraId(Number(valor));
              }} disabled={prefeituras.length === 0}>
                <SelectTrigger className="w-full" aria-label="Prefeitura"><SelectValue placeholder="Selecione a prefeitura">{(value: string | null) => prefeituras.find((item) => String(item.id) === value)?.name ?? "Selecione a prefeitura"}</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>{prefeituras.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            )}
          </IndicatorFilterField>
        }
        filters={prefeituraId !== null ? (
          <>
            {visao === "acompanhamento" ? <IndicatorFilterField label="Buscar" className="sm:col-span-2"><div className="relative"><Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, equipe ou micro-área" aria-label="Buscar mulher ou equipe" className="pl-8" /></div></IndicatorFilterField> : null}
            <CatalogFilterDropdown label="Equipe" ariaLabel="Filtrar por equipe" groupLabel="Equipes" loadingLabel="Carregando equipes…" summaryLabel={equipesSelecionadas.length ? `${equipesSelecionadas.length} equipe(s)` : "Todas as equipes"} items={equipes} selectedKeys={equipesSelecionadas} getKey={(item) => item.chave} getPrimaryLabel={(item) => item.sem_equipe ? "Sem equipe" : item.nome ?? "Equipe sem nome"} getSecondaryLabel={(item) => `${item.ine ? `INE ${item.ine}` : "Sem INE"} · ${item.total_mulheres} mulher(es)`} onToggle={(chave, selecionada) => atualizarEquipes(selecionada ? [...equipesSelecionadas, chave] : equipesSelecionadas.filter((item) => item !== chave))} />
            <CatalogFilterDropdown label="Micro-área" ariaLabel="Filtrar por micro-área" groupLabel="Micro-áreas" loadingLabel="Carregando micro-áreas…" summaryLabel={microAreasSelecionadas.length ? `${microAreasSelecionadas.length} micro-área(s)` : "Todas as micro-áreas"} items={microAreas} selectedKeys={microAreasSelecionadas} getKey={(item) => item.chave} getPrimaryLabel={(item) => item.sem_micro_area ? "Sem micro-área" : item.codigo ?? ""} getSecondaryLabel={(item) => `${item.total_mulheres} mulher(es)`} onToggle={(chave, selecionada) => atualizarMicroAreas(selecionada ? [...microAreasSelecionadas, chave] : microAreasSelecionadas.filter((item) => item !== chave))} />
            {visao === "acompanhamento" ? <IndicatorFilterField label="Status geral"><Select value={statusFiltro} onValueChange={(valor) => valor && setStatusFiltro(valor as StatusFiltro)}><SelectTrigger className="w-full" aria-label="Filtrar por status"><SelectValue>{(value: StatusFiltro | null) => value === "completa" ? "Completa" : value === "pendente" ? "Pendente" : "Todos os status"}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos os status</SelectItem><SelectItem value="completa">Completa</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectGroup></SelectContent></Select></IndicatorFilterField> : null}
            {visao === "acompanhamento" ? <IndicatorFilterField label="Ordenar por"><Select value={ordenacao} onValueChange={(valor) => valor && setOrdenacao(valor as Ordenacao)}><SelectTrigger className="w-full" aria-label="Ordenar mulheres"><SelectValue>{(value: Ordenacao | null) => value === "pontuacao-desc" ? "Maior pontuação" : value === "pontuacao-asc" ? "Menor pontuação" : "Nome (A–Z)"}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="nome">Nome (A–Z)</SelectItem><SelectItem value="pontuacao-desc">Maior pontuação</SelectItem><SelectItem value="pontuacao-asc">Menor pontuação</SelectItem></SelectGroup></SelectContent></Select></IndicatorFilterField> : null}
          </>
        ) : undefined}
        summary={visao === "acompanhamento" && mulheres ? <p className="text-xs text-muted-foreground" aria-live="polite"><strong className="font-semibold text-foreground">{filtradas.length}</strong> de {mulheres.length} mulheres · Exibindo {filtradas.length === 0 ? 0 : inicioDaPagina + 1}–{Math.min(inicioDaPagina + ITENS_POR_PAGINA, filtradas.length)}</p> : undefined}
        actions={visao === "acompanhamento" && mulheres && mulheres.length > 0 ? (
          <Button variant="outline" size="sm" disabled={exportando} onClick={() => void exportar()}>
            {exportando ? <Loader2 className="animate-spin" /> : <Download />}
            Baixar planilha
          </Button>
        ) : undefined}
        activeFilters={<><CatalogFilterChips selectedKeys={equipesSelecionadas} getLabel={(chave) => equipes?.find((item) => item.chave === chave)?.nome ?? chave} clearLabel="Limpar equipes" onClear={() => atualizarEquipes([])} /><CatalogFilterChips selectedKeys={microAreasSelecionadas} getLabel={(chave) => microAreas?.find((item) => item.chave === chave)?.codigo ?? chave} clearLabel="Limpar micro-áreas" onClear={() => atualizarMicroAreas([])} /></>}
      />

      <Tabs value={visao} onValueChange={(valor) => setVisao(valor as Visao)} className="gap-3">
        <TabsList variant="line" aria-label="Visões do indicador de mulheres">
          <TabsTrigger value="acompanhamento">Tabela de acompanhamento</TabsTrigger>
          <TabsTrigger value="fechamento"><CalendarClock data-icon="inline-start" />Fechamento</TabsTrigger>
        </TabsList>
        <TabsContent value="acompanhamento">
          {erro ? <p role="alert" className="mb-3 text-sm text-destructive">{erro}</p> : null}
          {mulheres === null && !erro ? <div className="grid gap-2"><Skeleton className="h-10" /><Skeleton className="h-64" /></div> : mulheres?.length === 0 ? (
            <Empty><EmptyHeader><EmptyTitle>Nenhuma mulher no recorte</EmptyTitle><EmptyDescription>O último processamento não trouxe mulheres elegíveis para esta prefeitura.</EmptyDescription></EmptyHeader></Empty>
          ) : mulheres ? (
            <>
              <div className="grid gap-2 md:hidden" aria-label="Mulheres encontradas">
                {daPagina.map((mulher) => <Card key={mulher.id} className="gap-3 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{mulher.nome_cidadao}</p><p className="text-xs text-muted-foreground">{mulher.equipe_nome ?? "Sem equipe"} · {formatarData(mulher.data_nascimento)}</p></div><Pontuacao mulher={mulher} /></div><div className="grid grid-cols-2 gap-2 text-xs">{PRATICAS.map((pratica) => <div key={pratica.codigo} className="flex flex-col items-center gap-1 rounded-md border p-2"><span className="font-semibold">{pratica.codigo}</span><PraticaStatus mulher={mulher} pratica={pratica.codigo} /></div>)}</div></Card>)}
              </div>
              <Card className="hidden min-w-0 max-w-full gap-0 overflow-hidden py-0 md:block">
                <Table className="min-w-[1050px] text-xs [&_th]:whitespace-normal" containerClassName={cn("max-w-full cursor-grab overscroll-x-contain", dragging && "cursor-grabbing select-none")} containerProps={{ ...containerProps, role: "region", "aria-label": "Tabela nominal de mulheres; use as setas ou clique e arraste para ver as colunas" }}>
                  <TableHeader className="sticky top-0 z-[3] select-none bg-muted shadow-sm"><TableRow className="bg-muted hover:bg-muted"><TableHead className="sticky left-0 z-[4] min-w-48 border-r bg-muted">Mulher</TableHead><TableHead className="min-w-36">Equipe</TableHead><TableHead>Micro-área</TableHead><TableHead>Nascimento</TableHead>{PRATICAS.map((pratica) => <TableHead key={pratica.codigo} className="min-w-40 text-center"><span className="block text-[10px] text-muted-foreground">Prática {pratica.codigo}</span>{pratica.titulo}</TableHead>)}<TableHead className="text-right">Pontuação</TableHead><TableHead>Referência</TableHead></TableRow></TableHeader>
                  <TableBody>{daPagina.map((mulher) => <TableRow key={mulher.id} className="[content-visibility:auto]"><TableCell className="sticky left-0 z-[1] max-w-56 border-r bg-background font-medium"><span className="block truncate" title={mulher.nome_cidadao}>{mulher.nome_cidadao}</span></TableCell><TableCell>{mulher.equipe_nome ?? "Sem equipe"}</TableCell><TableCell>{mulher.micro_area ?? "Sem micro-área"}</TableCell><TableCell>{formatarData(mulher.data_nascimento)}</TableCell>{PRATICAS.map((pratica) => <TableCell key={pratica.codigo}><PraticaStatus mulher={mulher} pratica={pratica.codigo} /></TableCell>)}<TableCell className="text-right"><Pontuacao mulher={mulher} /></TableCell><TableCell>{formatarData(mulher.data_referencia)}</TableCell></TableRow>)}{filtradas.length === 0 ? <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">Nenhuma mulher corresponde aos filtros.</TableCell></TableRow> : null}</TableBody>
                </Table>
              </Card>
              <IndicatorPagination currentPage={paginaAtual} totalPages={totalPaginas} onChange={setPagina} ariaLabel="Paginação de mulheres" />
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="fechamento"><FechamentoC7 dados={fechamento} carregando={fechamento === null && erroFechamento === null} erro={erroFechamento} /></TabsContent>
      </Tabs>
    </div>
  );
}
