import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Baby,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  Search,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CatalogFilterChips } from "@/components/gestantes/catalog-filter-chips";
import { CatalogFilterDropdown } from "@/components/gestantes/catalog-filter-dropdown";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/page-header";
import type {
  EquipeGestanteOut,
  GestanteAcompanhamentoOut,
  MicroAreaGestanteOut,
  PrefeituraOut,
} from "@/lib/api-types";
import { apresentarAcaoCondicao, explicarMotivoCondicao } from "@/lib/condicao-autorreferida";
import { ApiError } from "@/lib/http";
import {
  PRATICAS,
  STATUS_PRATICA_ROTULO,
  statusDaPratica,
  statusGeralDaGestante,
  type StatusPratica,
} from "@/lib/gestante-praticas";
import { calcularAffordanceDeScroll, type ScrollAffordanceState } from "@/lib/scroll-affordance";
import { cn } from "@/lib/utils";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";

const STATUS_CLASSNAME: Record<StatusPratica, string> = {
  completa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  parcial: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pendente: "bg-muted text-muted-foreground",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function AcaoCondicaoGestante({ gestante }: { gestante: GestanteAcompanhamentoOut }) {
  const apresentacao = apresentarAcaoCondicao(gestante.condicao_gestante_acao);

  return (
    <div className="flex min-w-52 flex-col items-start gap-1">
      <Badge variant={apresentacao.variant}>{apresentacao.rotulo}</Badge>
      <span className="whitespace-normal text-xs text-muted-foreground">
        {explicarMotivoCondicao(gestante.condicao_gestante_motivo)}
      </span>
      <span className="text-xs text-muted-foreground">
        Dump: {formatDate(gestante.condicao_gestante_data_referencia)}
      </span>
    </div>
  );
}

type StatusFiltro = StatusPratica | "todos";
type ParametroFiltro = "todos" | (typeof PRATICAS)[number]["letra"];
type Ordenacao =
  | "nome-asc"
  | "pontuacao-desc"
  | "pontuacao-asc"
  | "parametro-desc"
  | "parametro-asc";
type PresetColunas = "essenciais" | "personalizado" | "todos";
type DensidadeTabela = "confortavel" | "compacta";
type ColunaId =
  | "equipe"
  | "micro-area"
  | "nascimento"
  | "ine"
  | "inicio-gestacao"
  | "fim-gestacao"
  | "fim-puerperio"
  | "elegibilidade"
  | "status"
  | "condicao-gestante"
  | "pontuacao"
  | "atualizado"
  | `pratica-${string}`;

const COLUNAS_FIXAS: ReadonlyArray<{ id: ColunaId; rotulo: string }> = [
  { id: "equipe", rotulo: "Equipe" },
  { id: "micro-area", rotulo: "Micro-área" },
  { id: "nascimento", rotulo: "Nascimento" },
  { id: "ine", rotulo: "INE" },
  { id: "inicio-gestacao", rotulo: "Início gestação" },
  { id: "fim-gestacao", rotulo: "Fim gestação" },
  { id: "fim-puerperio", rotulo: "Fim puerpério" },
  { id: "elegibilidade", rotulo: "Elegibilidade" },
  { id: "status", rotulo: "Status" },
  { id: "condicao-gestante", rotulo: "Ação no Cadastro Individual" },
  { id: "pontuacao", rotulo: "Pontuação" },
  { id: "atualizado", rotulo: "Atualizado em" },
];
const COLUNAS_ESSENCIAIS = new Set<ColunaId>([
  "equipe",
  "status",
  "condicao-gestante",
  "pontuacao",
]);
const COLUNAS_TODAS: ColunaId[] = [
  ...COLUNAS_FIXAS.map(({ id }) => id),
  ...PRATICAS.map(({ letra }) => `pratica-${letra}` as ColunaId),
];
const ITENS_POR_PAGINA = 20;

function paginasProximas(paginaAtual: number, totalPaginas: number): Array<number | "ellipsis"> {
  if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
  if (paginaAtual <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPaginas];
  if (paginaAtual >= totalPaginas - 3) {
    return [1, "ellipsis", totalPaginas - 4, totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
  }
  return [1, "ellipsis", paginaAtual - 1, paginaAtual, paginaAtual + 1, "ellipsis", totalPaginas];
}

function PaginacaoGestantes({
  paginaAtual,
  totalPaginas,
  onChange,
}: {
  paginaAtual: number;
  totalPaginas: number;
  onChange: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 border-t pt-3"
      aria-label="Paginação de gestantes"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft />
        <span className="hidden sm:inline">Anterior</span>
      </Button>
      <div className="flex items-center gap-1" aria-label={`Página ${paginaAtual} de ${totalPaginas}`}>
        {paginasProximas(paginaAtual, totalPaginas).map((pagina, indice) =>
          pagina === "ellipsis" ? (
            <span key={`ellipsis-${indice}`} className="px-1 text-sm text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={pagina}
              type="button"
              variant={pagina === paginaAtual ? "default" : "ghost"}
              size="sm"
              className="min-w-8 px-2 tabular-nums"
              onClick={() => onChange(pagina)}
              aria-current={pagina === paginaAtual ? "page" : undefined}
              aria-label={`Página ${pagina}`}
            >
              {pagina}
            </Button>
          ),
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight />
      </Button>
    </nav>
  );
}

export function GestantesPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [gestantes, setGestantes] = useState<GestanteAcompanhamentoOut[] | null>(null);
  const [equipes, setEquipes] = useState<EquipeGestanteOut[] | null>(null);
  const [equipesSelecionadas, setEquipesSelecionadas] = useState<string[]>(() =>
    [...new Set(new URLSearchParams(window.location.search).getAll("equipe"))].slice(0, 50),
  );
  const [microAreas, setMicroAreas] = useState<MicroAreaGestanteOut[] | null>(null);
  const [microAreasSelecionadas, setMicroAreasSelecionadas] = useState<string[]>(() =>
    [...new Set(new URLSearchParams(window.location.search).getAll("micro_area"))].slice(0, 50),
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const buscaDeferred = useDeferredValue(busca);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [parametroFiltro, setParametroFiltro] = useState<ParametroFiltro>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome-asc");
  const [presetColunas, setPresetColunas] = useState<PresetColunas>("essenciais");
  const [colunasPersonalizadas, setColunasPersonalizadas] = useState<ColunaId[]>([
    ...COLUNAS_ESSENCIAIS,
  ]);
  const [densidade, setDensidade] = useState<DensidadeTabela>("confortavel");
  const [cardsExpandidos, setCardsExpandidos] = useState<number[]>([]);
  const [pagina, setPagina] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollAffordance, setScrollAffordance] = useState<ScrollAffordanceState>({
    mostrarSombraEsquerda: false,
    mostrarSombraDireita: false,
  });

  const atualizarScrollAffordance = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollAffordance(calcularAffordanceDeScroll(el));
  }, []);

  // Recalcula quando os dados chegam (a tabela só existe/tem largura real
  // depois disso) e quando a janela muda de tamanho.
  useEffect(() => {
    atualizarScrollAffordance();
    window.addEventListener("resize", atualizarScrollAffordance);
    return () => window.removeEventListener("resize", atualizarScrollAffordance);
  }, [atualizarScrollAffordance, gestantes]);

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

  const atualizarEquipesSelecionadas = useCallback(
    (proximas: string[]) => {
      const normalizadas = [...new Set(proximas)].toSorted();
      setEquipesSelecionadas(normalizadas);
      const url = new URL(window.location.href);
      url.searchParams.delete("equipe");
      normalizadas.forEach((equipe) => url.searchParams.append("equipe", equipe));
      window.history.replaceState(window.history.state, "", url);
    },
    [],
  );

  const atualizarMicroAreasSelecionadas = useCallback((proximas: string[]) => {
    const normalizadas = [...new Set(proximas)].toSorted();
    setMicroAreasSelecionadas(normalizadas);
    const url = new URL(window.location.href);
    url.searchParams.delete("micro_area");
    normalizadas.forEach((microArea) => url.searchParams.append("micro_area", microArea));
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const handleTrocarPrefeitura = useCallback(
    (value: string | null) => {
      if (!value) return;
      atualizarEquipesSelecionadas([]);
      atualizarMicroAreasSelecionadas([]);
      setEquipes(null);
      setMicroAreas(null);
      setGestantes(null);
      setSelectedId(Number(value));
    },
    [atualizarEquipesSelecionadas, atualizarMicroAreasSelecionadas],
  );

  const alternarEquipe = useCallback(
    (chave: string, selecionada: boolean) => {
      atualizarEquipesSelecionadas(
        selecionada
          ? [...equipesSelecionadas, chave]
          : equipesSelecionadas.filter((equipe) => equipe !== chave),
      );
    },
    [atualizarEquipesSelecionadas, equipesSelecionadas],
  );

  const alternarMicroArea = useCallback(
    (chave: string, selecionada: boolean) => {
      atualizarMicroAreasSelecionadas(
        selecionada
          ? [...microAreasSelecionadas, chave]
          : microAreasSelecionadas.filter((microArea) => microArea !== chave),
      );
    },
    [atualizarMicroAreasSelecionadas, microAreasSelecionadas],
  );

  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    setEquipes(null);
    gestanteService
      .equipes(selectedId, controller.signal)
      .then((catalogo) => {
        setEquipes(catalogo);
      })
      .catch((erro: unknown) => {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        setEquipes([]);
      });
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    setMicroAreas(null);
    gestanteService
      .microAreas(selectedId, controller.signal)
      .then((catalogo) => {
        setMicroAreas(catalogo);
      })
      .catch((erro: unknown) => {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        setMicroAreas([]);
      });
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    if (equipes === null) return;
    const chavesValidas = new Set(equipes.map((equipe) => equipe.chave));
    const selecoesValidas = equipesSelecionadas.filter((chave) => chavesValidas.has(chave));
    if (selecoesValidas.length !== equipesSelecionadas.length) {
      atualizarEquipesSelecionadas(selecoesValidas);
    }
  }, [atualizarEquipesSelecionadas, equipes, equipesSelecionadas]);

  useEffect(() => {
    if (microAreas === null) return;
    const chavesValidas = new Set(microAreas.map((microArea) => microArea.chave));
    const selecoesValidas = microAreasSelecionadas.filter((chave) => chavesValidas.has(chave));
    if (selecoesValidas.length !== microAreasSelecionadas.length) {
      atualizarMicroAreasSelecionadas(selecoesValidas);
    }
  }, [atualizarMicroAreasSelecionadas, microAreas, microAreasSelecionadas]);

  const loadGestantes = useCallback(async (signal?: AbortSignal) => {
    if (selectedId === null) return;
    try {
      const data = await gestanteService.list(
        selectedId,
        equipesSelecionadas,
        microAreasSelecionadas,
        signal,
      );
      setGestantes(data);
      setLoadError(null);
      setForbidden(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
        setGestantes(null);
        setLoadError(null);
        return;
      }
      setForbidden(false);
      setLoadError(
        err instanceof ApiError ? err.detail : "Não foi possível carregar os dados de gestantes.",
      );
    }
  }, [equipesSelecionadas, microAreasSelecionadas, selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    setForbidden(false);
    void loadGestantes(controller.signal);
    return () => controller.abort();
  }, [loadGestantes]);

  const handleExportar = useCallback(async () => {
    if (selectedId === null) return;
    setExportando(true);
    setExportError(null);
    try {
      const { blob, filename } = await gestanteService.exportar(
        selectedId,
        equipesSelecionadas,
        microAreasSelecionadas,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof ApiError ? err.detail : "Não foi possível gerar a planilha.",
      );
    } finally {
      setExportando(false);
    }
  }, [equipesSelecionadas, microAreasSelecionadas, selectedId]);

  const rotuloFiltroEquipe =
    equipesSelecionadas.length === 0
      ? "Todas as equipes"
      : equipesSelecionadas.length === 1
        ? (equipes?.find((equipe) => equipe.chave === equipesSelecionadas[0])?.sem_equipe
            ? "Sem equipe"
            : equipes?.find((equipe) => equipe.chave === equipesSelecionadas[0])?.nome ?? "1 equipe")
        : `${equipesSelecionadas.length} equipes`;

  const rotuloFiltroMicroArea =
    microAreasSelecionadas.length === 0
      ? "Todas as micro-áreas"
      : microAreasSelecionadas.length === 1
        ? (microAreas?.find((item) => item.chave === microAreasSelecionadas[0])?.sem_micro_area
            ? "Sem micro-área"
            : microAreas?.find((item) => item.chave === microAreasSelecionadas[0])?.codigo ??
              "1 micro-área")
        : `${microAreasSelecionadas.length} micro-áreas`;

  const podeExportar = !forbidden && !loadError && gestantes !== null && gestantes.length > 0;
  const colunaVisivel = useCallback(
    (coluna: ColunaId) =>
      presetColunas === "todos" ||
      (presetColunas === "essenciais" && COLUNAS_ESSENCIAIS.has(coluna)) ||
      (presetColunas === "personalizado" && colunasPersonalizadas.includes(coluna)),
    [colunasPersonalizadas, presetColunas],
  );
  const alternarColuna = useCallback((coluna: ColunaId, checked: boolean) => {
    setColunasPersonalizadas((atuais) =>
      checked ? [...new Set([...atuais, coluna])] : atuais.filter((item) => item !== coluna),
    );
  }, []);
  const alternarCard = useCallback((id: number) => {
    setCardsExpandidos((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  }, []);
  const gestantesFiltradas = useMemo(() => {
    if (!gestantes) return [];
    const termo = buscaDeferred.trim().toLocaleLowerCase("pt-BR");
    const resultado = gestantes.filter((gestante) => {
      const correspondeBusca =
        termo.length === 0 ||
        gestante.nome_cidadao.toLocaleLowerCase("pt-BR").includes(termo) ||
        (gestante.equipe_nome ?? "").toLocaleLowerCase("pt-BR").includes(termo) ||
        (gestante.equipe_ine ?? "").toLocaleLowerCase("pt-BR").includes(termo) ||
        (gestante.micro_area ?? "").toLocaleLowerCase("pt-BR").includes(termo);
      const praticaSelecionada = PRATICAS.find((pratica) => pratica.letra === parametroFiltro);
      const statusParaFiltro = praticaSelecionada
        ? statusDaPratica(gestante, praticaSelecionada).status
        : statusGeralDaGestante(gestante);
      const correspondeStatus = statusFiltro === "todos" || statusParaFiltro === statusFiltro;
      return correspondeBusca && correspondeStatus;
    });

    return resultado.toSorted((a, b) => {
      if (ordenacao === "pontuacao-desc") return b.pontuacao_total - a.pontuacao_total;
      if (ordenacao === "pontuacao-asc") return a.pontuacao_total - b.pontuacao_total;
      const praticaSelecionada = PRATICAS.find((pratica) => pratica.letra === parametroFiltro);
      if (praticaSelecionada && ordenacao.startsWith("parametro-")) {
        const ordemStatus: Record<StatusPratica, number> = { completa: 2, parcial: 1, pendente: 0 };
        const statusA = statusDaPratica(a, praticaSelecionada).status;
        const statusB = statusDaPratica(b, praticaSelecionada).status;
        const diferenca = ordemStatus[statusA] - ordemStatus[statusB];
        if (diferenca !== 0) return ordenacao === "parametro-desc" ? -diferenca : diferenca;
      }
      return a.nome_cidadao.localeCompare(b.nome_cidadao, "pt-BR");
    });
  }, [buscaDeferred, gestantes, ordenacao, parametroFiltro, statusFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(gestantesFiltradas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioDaPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const gestantesDaPagina = useMemo(
    () => gestantesFiltradas.slice(inicioDaPagina, inicioDaPagina + ITENS_POR_PAGINA),
    [gestantesFiltradas, inicioDaPagina],
  );

  useEffect(() => {
    setPagina(1);
    setCardsExpandidos([]);
  }, [buscaDeferred, equipesSelecionadas, gestantes, microAreasSelecionadas, ordenacao, parametroFiltro, selectedId, statusFiltro]);

  const trocarPagina = useCallback((proximaPagina: number) => {
    setPagina(proximaPagina);
    setCardsExpandidos([]);
  }, []);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Gestantes e puerpério"
        description="Indicador C3 (Previne Brasil) — acompanhamento nominal para busca ativa."
        actions={
          podeExportar ? (
            <Button variant="outline" onClick={handleExportar} disabled={exportando}>
              {exportando ? <Loader2 className="animate-spin" /> : <Download />}
              Baixar planilha
            </Button>
          ) : undefined
        }
      />
      {exportError ? <p className="mb-4 text-sm text-destructive">{exportError}</p> : null}

      <div className="mb-4 max-w-xs">
        {prefeituras === null ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={selectedId ? String(selectedId) : undefined}
            onValueChange={handleTrocarPrefeitura}
            disabled={prefeituras.length === 0}
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
          Cadastre uma prefeitura para visualizar o indicador de gestantes.
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
      ) : gestantes === null ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : gestantes.length === 0 &&
        equipesSelecionadas.length === 0 &&
        microAreasSelecionadas.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Baby />
            </EmptyMedia>
            <EmptyTitle>Nenhuma gestante em acompanhamento</EmptyTitle>
            <EmptyDescription>
              Não há gestantes ou puérperas registradas para esta prefeitura na última extração.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
                Buscar gestante ou equipe
                <div className="relative">
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Nome, equipe, INE ou micro-área"
                    className="pl-8"
                  />
                </div>
              </label>
              <CatalogFilterDropdown
                label="Equipe"
                ariaLabel="Filtrar por equipe"
                groupLabel="Equipes da prefeitura"
                loadingLabel="Carregando equipes…"
                summaryLabel={rotuloFiltroEquipe}
                items={equipes}
                selectedKeys={equipesSelecionadas}
                getKey={(equipe) => equipe.chave}
                getPrimaryLabel={(equipe) =>
                  equipe.sem_equipe ? "Sem equipe" : equipe.nome ?? "Equipe sem nome"
                }
                getSecondaryLabel={(equipe) =>
                  `${equipe.ine ? `INE ${equipe.ine}` : "Sem INE"} · ${equipe.total_gestantes} gestante(s)`
                }
                onToggle={alternarEquipe}
              />
              <CatalogFilterDropdown
                label="Micro-área"
                ariaLabel="Filtrar por micro-área"
                groupLabel="Micro-áreas da prefeitura"
                loadingLabel="Carregando micro-áreas…"
                summaryLabel={rotuloFiltroMicroArea}
                items={microAreas}
                selectedKeys={microAreasSelecionadas}
                getKey={(microArea) => microArea.chave}
                getPrimaryLabel={(microArea) =>
                  microArea.sem_micro_area ? "Sem micro-área" : microArea.codigo ?? ""
                }
                getSecondaryLabel={(microArea) => `${microArea.total_gestantes} gestante(s)`}
                onToggle={alternarMicroArea}
              />
              <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-muted-foreground">
                Parâmetro
                <Select
                  value={parametroFiltro}
                  onValueChange={(value) => {
                    if (!value) return;
                    setParametroFiltro(value as ParametroFiltro);
                    if (value === "todos" && ordenacao.startsWith("parametro-")) {
                      setOrdenacao("nome-asc");
                    }
                  }}
                >
                  <SelectTrigger className="w-full" aria-label="Filtrar por parâmetro">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="todos">Acompanhamento geral</SelectItem>
                      {PRATICAS.map((pratica) => (
                        <SelectItem key={pratica.letra} value={pratica.letra}>
                          {pratica.letra} · {pratica.rotulo}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-muted-foreground">
                {parametroFiltro === "todos" ? "Status do acompanhamento" : "Status do parâmetro"}
                <Select
                  value={statusFiltro}
                  onValueChange={(value) => value && setStatusFiltro(value as StatusFiltro)}
                >
                  <SelectTrigger className="w-full" aria-label="Filtrar por status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="completa">Completa</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-muted-foreground">
                Ordenar por
                <Select
                  value={ordenacao}
                  onValueChange={(value) => value && setOrdenacao(value as Ordenacao)}
                >
                  <SelectTrigger className="w-full" aria-label="Ordenar gestantes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="nome-asc">Nome (A–Z)</SelectItem>
                      <SelectItem value="pontuacao-desc">Maior pontuação</SelectItem>
                      <SelectItem value="pontuacao-asc">Menor pontuação</SelectItem>
                      {parametroFiltro !== "todos" ? (
                        <>
                          <SelectItem value="parametro-desc">Parâmetro: melhor resultado</SelectItem>
                          <SelectItem value="parametro-asc">Parâmetro: pior resultado</SelectItem>
                        </>
                      ) : null}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <strong className="font-semibold text-foreground">{gestantesFiltradas.length}</strong>{" "}
                de {gestantes.length} gestantes · Exibindo {gestantesFiltradas.length === 0 ? 0 : inicioDaPagina + 1}–
                {Math.min(inicioDaPagina + ITENS_POR_PAGINA, gestantesFiltradas.length)}
              </p>
              <Tabs
                value={presetColunas}
                onValueChange={(value) => setPresetColunas(value as PresetColunas)}
              >
                <TabsList aria-label="Colunas visíveis">
                  <TabsTrigger value="essenciais">Essenciais</TabsTrigger>
                  <TabsTrigger value="personalizado">Personalizado</TabsTrigger>
                  <TabsTrigger value="todos">Todos os parâmetros</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CatalogFilterChips
              selectedKeys={equipesSelecionadas}
              getLabel={(chave) => {
                const equipe = equipes?.find((item) => item.chave === chave);
                return equipe?.sem_equipe ? "Sem equipe" : equipe?.nome ?? chave;
              }}
              clearLabel="Limpar equipes"
              onClear={() => atualizarEquipesSelecionadas([])}
            />
            <CatalogFilterChips
              selectedKeys={microAreasSelecionadas}
              getLabel={(chave) => {
                const microArea = microAreas?.find((item) => item.chave === chave);
                return microArea?.sem_micro_area ? "Sem micro-área" : microArea?.codigo ?? chave;
              }}
              clearLabel="Limpar micro-áreas"
              onClear={() => atualizarMicroAreasSelecionadas([])}
            />
            <div className="flex flex-wrap items-end gap-3">
              {presetColunas === "personalizado" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" size="sm" />}
                    aria-label="Escolher colunas visíveis"
                  >
                    <Settings2 data-icon="inline-start" />
                    Escolher colunas
                    <ChevronDown data-icon="inline-end" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="start">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Dados da gestante</DropdownMenuLabel>
                      {COLUNAS_FIXAS.map((coluna) => (
                        <DropdownMenuCheckboxItem
                          key={coluna.id}
                          checked={colunasPersonalizadas.includes(coluna.id)}
                          onCheckedChange={(checked) => alternarColuna(coluna.id, checked)}
                        >
                          {coluna.rotulo}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Parâmetros do indicador</DropdownMenuLabel>
                      {PRATICAS.map((pratica) => {
                        const id = `pratica-${pratica.letra}` as ColunaId;
                        return (
                          <DropdownMenuCheckboxItem
                            key={id}
                            checked={colunasPersonalizadas.includes(id)}
                            onCheckedChange={(checked) => alternarColuna(id, checked)}
                          >
                            {pratica.letra} · {pratica.rotulo}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <label className="flex min-w-40 flex-col gap-1 text-xs font-medium text-muted-foreground">
                Densidade da tabela
                <Select
                  value={densidade}
                  onValueChange={(value) => value && setDensidade(value as DensidadeTabela)}
                >
                  <SelectTrigger className="w-full" aria-label="Densidade da tabela">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="confortavel">Confortável</SelectItem>
                      <SelectItem value="compacta">Compacta</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Legenda:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Completa
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" /> Parcial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/40" /> Pendente
            </span>
          </div>
          {/* Coluna "Gestante" sticky usa z-[1], não z-10: o Sidebar
              (position: fixed) também usa z-10 — no mesmo nível, a ordem do
              DOM decide, e a tabela (renderizada depois) pintava por cima da
              sidebar durante o scroll horizontal (FLO-40). z-[1] fica acima
              das outras células da tabela, mas abaixo da sidebar. */}
          <div className="flex flex-col gap-3 md:hidden" aria-label="Gestantes encontradas">
            {gestantesDaPagina.map((gestante) => {
              const statusGeral = statusGeralDaGestante(gestante);
              const expandido = cardsExpandidos.includes(gestante.id);
              return (
                <Card key={gestante.id} className={cn("gap-3", densidade === "compacta" ? "p-3" : "p-4")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{gestante.nome_cidadao}</p>
                      <p className="text-sm text-muted-foreground">{gestante.equipe_nome ?? "Sem equipe"}</p>
                    </div>
                    <Badge variant="outline" className={STATUS_CLASSNAME[statusGeral]}>
                      {STATUS_PRATICA_ROTULO[statusGeral]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>Pontuação</span>
                    <Badge className="tabular-nums">{gestante.pontuacao_total}</Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ação no Cadastro Individual
                    </span>
                    <AcaoCondicaoGestante gestante={gestante} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    aria-expanded={expandido}
                    aria-controls={`detalhes-gestante-${gestante.id}`}
                    onClick={() => alternarCard(gestante.id)}
                  >
                    {expandido ? "Ocultar detalhes" : "Ver todos os parâmetros"}
                    <ChevronDown className={cn("transition-transform", expandido && "rotate-180")} data-icon="inline-end" />
                  </Button>
                  {expandido ? (
                    <div id={`detalhes-gestante-${gestante.id}`} className="flex flex-col gap-4">
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Nascimento</dt><dd>{formatDate(gestante.data_nascimento)}</dd>
                        <dt className="text-muted-foreground">INE</dt><dd>{gestante.equipe_ine ?? "—"}</dd>
                        <dt className="text-muted-foreground">Micro-área</dt><dd>{gestante.micro_area ?? "—"}</dd>
                        <dt className="text-muted-foreground">Início gestação</dt><dd>{formatDate(gestante.dt_inicio_gestacao)}</dd>
                        <dt className="text-muted-foreground">Fim gestação</dt><dd>{formatDate(gestante.dt_fim_gestacao)}</dd>
                        <dt className="text-muted-foreground">Fim puerpério</dt><dd>{formatDate(gestante.dt_fim_puerperio)}</dd>
                        <dt className="text-muted-foreground">Elegibilidade</dt><dd>{gestante.excluida_por_aborto ? "Excluída (aborto)" : "Incluída"}</dd>
                        <dt className="text-muted-foreground">Atualizado em</dt><dd>{formatDateTime(gestante.created_at)}</dd>
                      </dl>
                      <dl className="flex flex-col gap-2 text-sm">
                        {PRATICAS.map((pratica) => {
                          const { status, texto } = statusDaPratica(gestante, pratica);
                          return (
                            <div key={pratica.letra} className="flex items-center justify-between gap-3">
                              <dt>{pratica.letra} · {pratica.rotulo}</dt>
                              <dd><span className={cn("inline-flex min-w-9 justify-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", STATUS_CLASSNAME[status])}>{texto}</span></dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  ) : null}
                </Card>
              );
            })}
            {gestantesFiltradas.length === 0 ? (
              <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nenhuma gestante corresponde aos filtros selecionados.</p>
            ) : null}
          </div>
          <div className="relative hidden min-w-0 max-w-full md:block">
            {/* Sombras de affordance — indicam que há mais colunas fora da
                tela, sem precisar descobrir arrastando por acaso (FLO-41).
                z-[2]: acima da coluna sticky (z-[1]), abaixo da sidebar
                (z-10, mesma regra do FLO-40). */}
            <div
              aria-hidden
              data-testid="overflow-esquerda"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 bg-gradient-to-r from-card to-transparent opacity-0 transition-opacity duration-150",
                scrollAffordance.mostrarSombraEsquerda && "opacity-100",
              )}
            />
            <div
              aria-hidden
              data-testid="overflow-direita"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-[2] w-10 bg-gradient-to-l from-card to-transparent opacity-0 transition-opacity duration-150",
                scrollAffordance.mostrarSombraDireita && "opacity-100",
              )}
            />
            <Card className="min-w-0 max-w-full gap-0 border-border/60 py-0 shadow-sm">
            <Table
              containerClassName="max-w-full overscroll-x-contain"
              containerProps={{
                ref: scrollRef,
                onScroll: atualizarScrollAffordance,
                role: "region",
                "aria-label": "Tabela nominal de gestantes; use as setas horizontais para ver mais colunas",
                tabIndex: 0,
              }}
              className={cn(densidade === "compacta" && "[&_td]:py-1 [&_th]:h-8")}
            >
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="sticky left-0 z-[1] min-w-40 bg-muted/40">Gestante</TableHead>
                  {colunaVisivel("equipe") ? <TableHead>Equipe</TableHead> : null}
                  {colunaVisivel("micro-area") ? <TableHead>Micro-área</TableHead> : null}
                  {colunaVisivel("nascimento") ? <TableHead>Nascimento</TableHead> : null}
                  {colunaVisivel("ine") ? <TableHead>INE</TableHead> : null}
                  {colunaVisivel("inicio-gestacao") ? <TableHead>Início gestação</TableHead> : null}
                  {colunaVisivel("fim-gestacao") ? <TableHead>Fim gestação</TableHead> : null}
                  {colunaVisivel("fim-puerperio") ? <TableHead>Fim puerpério</TableHead> : null}
                  {colunaVisivel("elegibilidade") ? <TableHead>Elegibilidade</TableHead> : null}
                  {colunaVisivel("status") ? <TableHead>Status</TableHead> : null}
                  {colunaVisivel("condicao-gestante") ? (
                    <TableHead>Ação no Cadastro Individual</TableHead>
                  ) : null}
                  {PRATICAS.filter((pratica) => colunaVisivel(`pratica-${pratica.letra}`)).map((pratica) => (
                    <TableHead key={pratica.letra} className="min-w-28 text-center align-bottom">
                      <Tooltip>
                        <TooltipTrigger className="flex w-full cursor-default flex-col items-center gap-0.5">
                          <span className="text-[10px] font-normal tracking-wide text-muted-foreground">
                            {pratica.letra}
                          </span>
                          <span className="text-xs leading-tight font-semibold whitespace-normal text-foreground">
                            {pratica.rotulo}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{pratica.titulo}</TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  {colunaVisivel("pontuacao") ? <TableHead className="text-right">Pontuação</TableHead> : null}
                  {colunaVisivel("atualizado") ? <TableHead>Atualizado em</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
            {gestantesDaPagina.map((gestante) => {
                  const statusGeral = statusGeralDaGestante(gestante);
                  return (
                  <TableRow key={gestante.id}>
                    <TableCell className="sticky left-0 z-[1] min-w-40 max-w-52 bg-background font-medium">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate" title={gestante.nome_cidadao}>{gestante.nome_cidadao}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(gestante.data_nascimento)}
                          {gestante.excluida_por_aborto ? (
                            <Badge variant="outline" className="ml-2">
                              Excluída (aborto)
                            </Badge>
                          ) : null}
                        </span>
                      </div>
                    </TableCell>
                    {colunaVisivel("equipe") ? <TableCell className="text-muted-foreground">
                      {gestante.equipe_nome ?? "—"}
                    </TableCell> : null}
                    {colunaVisivel("micro-area") ? <TableCell className="text-muted-foreground">
                      {gestante.micro_area ?? "—"}
                    </TableCell> : null}
                    {colunaVisivel("nascimento") ? <TableCell>{formatDate(gestante.data_nascimento)}</TableCell> : null}
                    {colunaVisivel("ine") ? <TableCell className="font-mono text-xs">{gestante.equipe_ine ?? "—"}</TableCell> : null}
                    {colunaVisivel("inicio-gestacao") ? <TableCell>{formatDate(gestante.dt_inicio_gestacao)}</TableCell> : null}
                    {colunaVisivel("fim-gestacao") ? <TableCell>{formatDate(gestante.dt_fim_gestacao)}</TableCell> : null}
                    {colunaVisivel("fim-puerperio") ? <TableCell>{formatDate(gestante.dt_fim_puerperio)}</TableCell> : null}
                    {colunaVisivel("elegibilidade") ? <TableCell>{gestante.excluida_por_aborto ? "Excluída (aborto)" : "Incluída"}</TableCell> : null}
                    {colunaVisivel("status") ? <TableCell>
                      <Badge variant="outline" className={STATUS_CLASSNAME[statusGeral]}>
                        {STATUS_PRATICA_ROTULO[statusGeral]}
                      </Badge>
                    </TableCell> : null}
                    {colunaVisivel("condicao-gestante") ? (
                      <TableCell><AcaoCondicaoGestante gestante={gestante} /></TableCell>
                    ) : null}
                    {PRATICAS.filter((pratica) => colunaVisivel(`pratica-${pratica.letra}`)).map((pratica) => {
                      const { status, texto } = statusDaPratica(gestante, pratica);
                      return (
                        <TableCell key={pratica.letra} className="text-center">
                          <span
                            className={cn(
                              "inline-flex min-w-9 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                              STATUS_CLASSNAME[status],
                            )}
                          >
                            {texto}
                          </span>
                        </TableCell>
                      );
                    })}
                    {colunaVisivel("pontuacao") ? <TableCell className="text-right">
                      <Badge className="tabular-nums">{gestante.pontuacao_total}</Badge>
                    </TableCell> : null}
                    {colunaVisivel("atualizado") ? (
                      <TableCell>{formatDateTime(gestante.created_at)}</TableCell>
                    ) : null}
                  </TableRow>
                  );
                })}
                {gestantesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={1 + COLUNAS_TODAS.filter(colunaVisivel).length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma gestante corresponde aos filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            </Card>
          </div>
          <PaginacaoGestantes
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            onChange={trocarPagina}
          />
        </>
      )}
    </div>
  );
}
