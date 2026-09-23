import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { CatalogFilterChips } from "@/components/gestantes/catalog-filter-chips";
import { CatalogFilterDropdown } from "@/components/gestantes/catalog-filter-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CriancaAcompanhamentoOut,
  EquipeCriancaOut,
  MetricasEquipeCriancaOut,
  MicroAreaCriancaOut,
  PrefeituraOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";
import { criancaService } from "@/services/crianca";
import { prefeiturasService } from "@/services/prefeituras";

type Status = "completa" | "parcial" | "pendente" | "em_prazo";
type StatusFiltro = Exclude<Status, "em_prazo"> | "todos";
type Pratica = "A" | "B" | "C" | "D" | "E";
type Ordenacao = "nome" | "pontuacao-desc" | "pontuacao-asc";

const PRATICAS: ReadonlyArray<{ codigo: Pratica; rotulo: string }> = [
  { codigo: "A", rotulo: "1ª consulta até 30 dias" },
  { codigo: "B", rotulo: "9 consultas de puericultura" },
  { codigo: "C", rotulo: "9 registros de peso e altura" },
  { codigo: "D", rotulo: "2 visitas nas janelas" },
  { codigo: "E", rotulo: "Esquemas vacinais" },
];

const STATUS_CLASS: Record<Status, string> = {
  completa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  parcial: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pendente: "bg-muted text-muted-foreground",
  em_prazo: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

const ITENS_POR_PAGINA = 30;

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function diasEntre(inicio: string, fim: string): number {
  return Math.floor(
    (new Date(`${fim}T00:00:00`).getTime() - new Date(`${inicio}T00:00:00`).getTime()) /
      86_400_000,
  );
}

function statusPratica(crianca: CriancaAcompanhamentoOut, pratica: Pratica): Status {
  if (pratica === "A") {
    if (crianca.pratica_a_primeira_consulta_30_dias) return "completa";
    return diasEntre(crianca.data_nascimento, crianca.data_referencia) <= 30
      ? "em_prazo"
      : "pendente";
  }
  if (pratica === "B") {
    if (crianca.pratica_b_consultas_puericultura >= 9) return "completa";
    return crianca.pratica_b_consultas_puericultura > 0 ? "parcial" : "pendente";
  }
  if (pratica === "C") {
    if (crianca.pratica_c_peso_altura >= 9) return "completa";
    return crianca.pratica_c_peso_altura > 0 ? "parcial" : "pendente";
  }
  if (pratica === "D") {
    if (crianca.pratica_d_visitas_completas) return "completa";
    const idadeDias = diasEntre(crianca.data_nascimento, crianca.data_referencia);
    if (idadeDias <= 30 || (idadeDias <= 183 && crianca.pratica_d_primeira_visita_30_dias)) {
      return "em_prazo";
    }
    return crianca.pratica_d_total_visitas_6_meses > 0 ? "parcial" : "pendente";
  }
  if (crianca.pratica_e_esquema_vacinal_completo) return "completa";
  const doses =
    crianca.vacina_dtp_doses +
    crianca.vacina_hepatite_b_doses +
    crianca.vacina_hib_doses +
    crianca.vacina_polio_doses +
    crianca.vacina_triplice_viral_doses +
    crianca.vacina_pneumococica_doses;
  return doses > 0 ? "parcial" : "pendente";
}

function statusGeral(crianca: CriancaAcompanhamentoOut): StatusFiltro {
  if (crianca.pontuacao_total === 100) return "completa";
  return crianca.pontuacao_total > 0 ? "parcial" : "pendente";
}

function marcador(status: Status, texto: string, titulo?: string) {
  const rotulo = status === "em_prazo" ? "Em prazo" : texto;
  return (
    <span
      className={cn(
        "inline-flex min-w-12 justify-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        STATUS_CLASS[status],
      )}
      title={titulo}
    >
      {rotulo}
    </span>
  );
}

function valorPratica(crianca: CriancaAcompanhamentoOut, pratica: Pratica) {
  const status = statusPratica(crianca, pratica);
  if (pratica === "A") {
    return marcador(
      status,
      crianca.pratica_a_primeira_consulta_30_dias ? "Feito" : "Fora do prazo",
      crianca.primeira_consulta_data
        ? `Primeira consulta presencial: ${formatarData(crianca.primeira_consulta_data)}`
        : "Nenhuma consulta presencial de puericultura localizada",
    );
  }
  if (pratica === "B") {
    return marcador(status, `${crianca.pratica_b_consultas_puericultura}/9`);
  }
  if (pratica === "C") return marcador(status, `${crianca.pratica_c_peso_altura}/9`);
  if (pratica === "D") {
    if (crianca.pratica_d_automatica_eap) {
      return marcador(
        "completa",
        "eAP",
        "Pontuação integral automática para equipe eAP tipo 76, conforme a nota C2.",
      );
    }
    return marcador(
      status,
      `${Number(crianca.pratica_d_primeira_visita_30_dias) + Number(crianca.pratica_d_segunda_visita_6_meses)}/2`,
      `Até 30 dias: ${crianca.pratica_d_primeira_visita_30_dias ? "feito" : "pendente"}. Até 6 meses: ${crianca.pratica_d_segunda_visita_6_meses ? "feito" : "pendente"}.`,
    );
  }
  return marcador(
    status,
    crianca.pratica_e_esquema_vacinal_completo ? "Feito" : "Pendente",
  );
}

function nomeEquipe(equipe: MetricasEquipeCriancaOut): string {
  if (equipe.sem_equipe) return "Sem equipe";
  return equipe.nome ?? (equipe.ine ? `Equipe INE ${equipe.ine}` : "Equipe sem nome");
}

function ComparacaoEquipes({
  equipes,
  onAbrir,
}: {
  equipes: MetricasEquipeCriancaOut[];
  onAbrir: (chave: string) => void;
}) {
  const [pratica, setPratica] = useState<Pratica>("A");
  const ranking = useMemo(
    () =>
      equipes
        .map((equipe) => ({
          equipe,
          metrica: equipe.praticas.find((item) => item.pratica === pratica),
        }))
        .toSorted(
          (a, b) =>
            (b.metrica?.percentual_cumprido ?? 0) -
              (a.metrica?.percentual_cumprido ?? 0) ||
            nomeEquipe(a.equipe).localeCompare(nomeEquipe(b.equipe), "pt-BR"),
        ),
    [equipes, pratica],
  );
  return (
    <section aria-label="Comparação entre equipes" className="mb-3 rounded-lg border bg-card p-3">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Comparação entre equipes</h2>
          <p className="text-xs text-muted-foreground">Percentual de crianças que cumpriram a prática.</p>
        </div>
        <Select value={pratica} onValueChange={(valor) => valor && setPratica(valor as Pratica)}>
          <SelectTrigger className="h-8 w-64 text-xs" aria-label="Prática para comparar equipes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PRATICAS.map((item) => (
                <SelectItem key={item.codigo} value={item.codigo}>
                  {item.codigo} · {item.rotulo}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        {ranking.map(({ equipe, metrica }) => (
          <button
            key={equipe.chave}
            type="button"
            onClick={() => onAbrir(equipe.chave)}
            className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
          >
            <span className="truncate text-xs font-medium">{nomeEquipe(equipe)}</span>
            <span className="text-right text-xs tabular-nums">
              {metrica?.total_cumprida ?? 0}/{equipe.total_criancas}
            </span>
            <strong className="text-right text-xs tabular-nums">
              {(metrica?.percentual_cumprido ?? 0).toLocaleString("pt-BR")}%
            </strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function Paginacao({ atual, total, onChange }: { atual: number; total: number; onChange: (pagina: number) => void }) {
  if (total <= 1) return null;
  return (
    <nav className="mt-3 flex items-center justify-center gap-2" aria-label="Paginação de crianças">
      <Button variant="outline" size="sm" disabled={atual === 1} onClick={() => onChange(atual - 1)}>
        <ChevronLeft /> Anterior
      </Button>
      <span className="text-xs text-muted-foreground">Página {atual} de {total}</span>
      <Button variant="outline" size="sm" disabled={atual === total} onClick={() => onChange(atual + 1)}>
        Próxima <ChevronRight />
      </Button>
    </nav>
  );
}

export function CriancasPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | null>(null);
  const [criancas, setCriancas] = useState<CriancaAcompanhamentoOut[] | null>(null);
  const [equipes, setEquipes] = useState<EquipeCriancaOut[] | null>(null);
  const [microAreas, setMicroAreas] = useState<MicroAreaCriancaOut[] | null>(null);
  const [equipesSelecionadas, setEquipesSelecionadas] = useState<string[]>(() =>
    [...new Set(new URLSearchParams(window.location.search).getAll("equipe"))].slice(0, 50),
  );
  const [microAreasSelecionadas, setMicroAreasSelecionadas] = useState<string[]>(() =>
    [...new Set(new URLSearchParams(window.location.search).getAll("micro_area"))].slice(0, 50),
  );
  const [busca, setBusca] = useState("");
  const buscaDeferred = useDeferredValue(busca);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [proibido, setProibido] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [comparacaoAberta, setComparacaoAberta] = useState(false);
  const [comparacao, setComparacao] = useState<MetricasEquipeCriancaOut[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const arrasteRef = useRef<{ pointerId: number; x: number; scrollLeft: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    prefeiturasService
      .list()
      .then((lista) => {
        setPrefeituras(lista);
        const primeira = lista.find((item) => item.active) ?? lista[0];
        setPrefeituraId(primeira?.id ?? null);
      })
      .catch(() => setPrefeituras([]));
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
      criancaService.equipes(prefeituraId, controller.signal),
      criancaService.microAreas(prefeituraId, controller.signal),
    ])
      .then(([catalogoEquipes, catalogoMicroAreas]) => {
        setEquipes(catalogoEquipes);
        setMicroAreas(catalogoMicroAreas);
      })
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        setEquipes([]);
        setMicroAreas([]);
      });
    return () => controller.abort();
  }, [prefeituraId]);

  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setCriancas(null);
    setErro(null);
    setProibido(false);
    criancaService
      .list(prefeituraId, equipesSelecionadas, microAreasSelecionadas, controller.signal)
      .then(setCriancas)
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        if (falha instanceof ApiError && falha.status === 403) {
          setProibido(true);
          return;
        }
        setErro(falha instanceof ApiError ? falha.detail : "Não foi possível carregar as crianças.");
      });
    return () => controller.abort();
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId]);

  useEffect(() => {
    if (!comparacaoAberta || prefeituraId === null) return;
    const controller = new AbortController();
    setComparacao(null);
    criancaService
      .compararEquipes(prefeituraId, controller.signal)
      .then(setComparacao)
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        setComparacao([]);
      });
    return () => controller.abort();
  }, [comparacaoAberta, prefeituraId]);

  const filtradas = useMemo(() => {
    if (!criancas) return [];
    const termo = buscaDeferred.trim().toLocaleLowerCase("pt-BR");
    return criancas
      .filter((crianca) => {
        const buscaOk =
          !termo ||
          crianca.nome_cidadao.toLocaleLowerCase("pt-BR").includes(termo) ||
          (crianca.equipe_nome ?? "").toLocaleLowerCase("pt-BR").includes(termo) ||
          (crianca.micro_area ?? "").toLocaleLowerCase("pt-BR").includes(termo);
        return buscaOk && (statusFiltro === "todos" || statusGeral(crianca) === statusFiltro);
      })
      .toSorted((a, b) => {
        if (ordenacao === "pontuacao-desc") return b.pontuacao_total - a.pontuacao_total;
        if (ordenacao === "pontuacao-asc") return a.pontuacao_total - b.pontuacao_total;
        return a.nome_cidadao.localeCompare(b.nome_cidadao, "pt-BR");
      });
  }, [buscaDeferred, criancas, ordenacao, statusFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const daPagina = filtradas.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA,
  );

  useEffect(() => setPagina(1), [buscaDeferred, equipesSelecionadas, microAreasSelecionadas, ordenacao, statusFiltro]);

  const exportar = useCallback(async () => {
    if (prefeituraId === null) return;
    setExportando(true);
    try {
      const { blob, filename } = await criancaService.exportar(
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
    } finally {
      setExportando(false);
    }
  }, [equipesSelecionadas, microAreasSelecionadas, prefeituraId]);

  function iniciarArraste(event: ReactPointerEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    if (!area || event.button !== 0 || area.scrollWidth <= area.clientWidth) return;
    if (event.target instanceof Element && event.target.closest("button, input, [role='button']")) return;
    arrasteRef.current = { pointerId: event.pointerId, x: event.clientX, scrollLeft: area.scrollLeft };
    area.setPointerCapture?.(event.pointerId);
    setArrastando(true);
    event.preventDefault();
  }

  function moverArraste(event: ReactPointerEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    const arraste = arrasteRef.current;
    if (!area || !arraste || arraste.pointerId !== event.pointerId) return;
    area.scrollLeft = arraste.scrollLeft + arraste.x - event.clientX;
    event.preventDefault();
  }

  function finalizarArraste(event: ReactPointerEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    if (!area || arrasteRef.current?.pointerId !== event.pointerId) return;
    if (area.hasPointerCapture?.(event.pointerId)) area.releasePointerCapture(event.pointerId);
    arrasteRef.current = null;
    setArrastando(false);
  }

  function navegar(event: KeyboardEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    if (!area || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const passo = Math.max(160, area.clientWidth * 0.7);
    if (event.key === "Home") area.scrollLeft = 0;
    else if (event.key === "End") area.scrollLeft = area.scrollWidth;
    else area.scrollLeft += event.key === "ArrowRight" ? passo : -passo;
    event.preventDefault();
  }

  if (proibido) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>Acesso não autorizado</EmptyTitle>
          <EmptyDescription>Seu cargo não permite visualizar o indicador infantil C2.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 max-w-xs">
        {prefeituras === null ? <Skeleton className="h-8" /> : (
          <Select
            value={prefeituraId ? String(prefeituraId) : undefined}
            onValueChange={(valor) => {
              if (!valor) return;
              atualizarEquipes([]);
              atualizarMicroAreas([]);
              setPrefeituraId(Number(valor));
            }}
            disabled={prefeituras.length === 0}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Prefeitura">
              <SelectValue placeholder="Selecione a prefeitura">
                {(value: string | null) =>
                  prefeituras.find((prefeitura) => String(prefeitura.id) === value)?.name ??
                  "Selecione a prefeitura"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent><SelectGroup>{prefeituras.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        )}
      </div>

      {erro ? <p role="alert" className="mb-3 text-sm text-destructive">{erro}</p> : null}
      {criancas === null && !erro ? (
        <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>
      ) : criancas?.length === 0 ? (
        <Empty><EmptyHeader><EmptyTitle>Nenhuma criança no recorte</EmptyTitle><EmptyDescription>O último backup não trouxe crianças elegíveis até 2 anos para esta prefeitura.</EmptyDescription></EmptyHeader></Empty>
      ) : criancas ? (
        <>
          <div className="mb-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_12rem_12rem_10rem_11rem]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
                <Input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar criança ou equipe" aria-label="Buscar criança ou equipe" className="h-8 pl-8 text-xs" />
              </div>
              <CatalogFilterDropdown
                label="Equipe"
                ariaLabel="Filtrar por equipe"
                groupLabel="Equipes"
                loadingLabel="Carregando equipes…"
                summaryLabel={equipesSelecionadas.length ? `${equipesSelecionadas.length} equipe(s)` : "Todas as equipes"}
                items={equipes}
                selectedKeys={equipesSelecionadas}
                getKey={(item) => item.chave}
                getPrimaryLabel={(item) => item.sem_equipe ? "Sem equipe" : item.nome ?? "Equipe sem nome"}
                getSecondaryLabel={(item) => `${item.ine ? `INE ${item.ine}` : "Sem INE"} · ${item.total_criancas} criança(s)`}
                onToggle={(chave, selecionada) => atualizarEquipes(selecionada ? [...equipesSelecionadas, chave] : equipesSelecionadas.filter((item) => item !== chave))}
              />
              <CatalogFilterDropdown
                label="Micro-área"
                ariaLabel="Filtrar por micro-área"
                groupLabel="Micro-áreas"
                loadingLabel="Carregando micro-áreas…"
                summaryLabel={microAreasSelecionadas.length ? `${microAreasSelecionadas.length} micro-área(s)` : "Todas as micro-áreas"}
                items={microAreas}
                selectedKeys={microAreasSelecionadas}
                getKey={(item) => item.chave}
                getPrimaryLabel={(item) => item.sem_micro_area ? "Sem micro-área" : item.codigo ?? ""}
                getSecondaryLabel={(item) => `${item.total_criancas} criança(s)`}
                onToggle={(chave, selecionada) => atualizarMicroAreas(selecionada ? [...microAreasSelecionadas, chave] : microAreasSelecionadas.filter((item) => item !== chave))}
              />
              <Select value={statusFiltro} onValueChange={(valor) => valor && setStatusFiltro(valor as StatusFiltro)}>
                <SelectTrigger className="h-8 text-xs" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="todos">Todos os status</SelectItem><SelectItem value="completa">Completo</SelectItem><SelectItem value="parcial">Parcial</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectGroup></SelectContent>
              </Select>
              <Select value={ordenacao} onValueChange={(valor) => valor && setOrdenacao(valor as Ordenacao)}>
                <SelectTrigger className="h-8 text-xs" aria-label="Ordenar crianças"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="nome">Nome (A–Z)</SelectItem><SelectItem value="pontuacao-desc">Maior pontuação</SelectItem><SelectItem value="pontuacao-asc">Menor pontuação</SelectItem></SelectGroup></SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">{filtradas.length}</strong> de {criancas.length} crianças</p>
              <div className="flex gap-2">
                {equipes && equipes.length > 1 ? <Button variant="outline" size="sm" onClick={() => setComparacaoAberta((atual) => !atual)}><BarChart3 />{comparacaoAberta ? "Ocultar comparação" : `Comparar equipes (${equipes.length})`}</Button> : null}
                <Button variant="outline" size="sm" disabled={exportando} onClick={() => void exportar()}>{exportando ? <Loader2 className="animate-spin" /> : <Download />}Baixar planilha</Button>
              </div>
            </div>
            <CatalogFilterChips selectedKeys={equipesSelecionadas} getLabel={(chave) => equipes?.find((item) => item.chave === chave)?.nome ?? chave} clearLabel="Limpar equipes" onClear={() => atualizarEquipes([])} />
            <CatalogFilterChips selectedKeys={microAreasSelecionadas} getLabel={(chave) => microAreas?.find((item) => item.chave === chave)?.codigo ?? chave} clearLabel="Limpar micro-áreas" onClear={() => atualizarMicroAreas([])} />
          </div>

          {comparacaoAberta ? comparacao === null ? <Skeleton className="mb-3 h-32" /> : comparacao.length > 1 ? <ComparacaoEquipes equipes={comparacao} onAbrir={(chave) => { atualizarEquipes([chave]); setComparacaoAberta(false); }} /> : <p className="mb-3 rounded-lg border p-3 text-xs text-muted-foreground">Não há duas equipes com crianças para comparar.</p> : null}

          <div className="grid gap-2 md:hidden" aria-label="Crianças encontradas">
            {daPagina.map((crianca) => (
              <Card key={crianca.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-2"><div><p className="font-medium">{crianca.nome_cidadao}</p><p className="text-xs text-muted-foreground">{crianca.equipe_nome ?? "Sem equipe"} · {formatarData(crianca.data_nascimento)}</p></div><Badge>{crianca.pontuacao_total}</Badge></div>
                <div className="grid grid-cols-2 gap-2 text-xs">{PRATICAS.map((pratica) => <div key={pratica.codigo} className="flex items-center justify-between gap-1"><span>{pratica.codigo}</span>{valorPratica(crianca, pratica.codigo)}</div>)}</div>
              </Card>
            ))}
          </div>

          <Card className="hidden min-w-0 max-w-full gap-0 overflow-hidden py-0 md:block">
            <Table
              className="text-xs [&_th]:h-9 [&_th]:whitespace-normal [&_th]:px-2 [&_td]:px-2 [&_td]:py-2"
              containerClassName={cn("max-h-[calc(100vh-11rem)] max-w-full cursor-grab overscroll-contain", arrastando && "cursor-grabbing select-none")}
              containerProps={{
                ref: scrollRef,
                onPointerDown: iniciarArraste,
                onPointerMove: moverArraste,
                onPointerUp: finalizarArraste,
                onPointerCancel: finalizarArraste,
                onLostPointerCapture: finalizarArraste,
                onKeyDown: navegar,
                role: "region",
                "aria-label": "Tabela nominal de crianças; use as setas ou clique e arraste para ver as colunas",
                tabIndex: 0,
              }}
            >
              <TableHeader className="sticky top-0 z-[3] bg-muted shadow-sm">
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="sticky left-0 z-[4] min-w-44 border-r bg-muted">Criança</TableHead>
                  <TableHead className="min-w-32">Equipe</TableHead><TableHead>Micro-área</TableHead><TableHead>Nascimento</TableHead>
                  {PRATICAS.map((item) => <TableHead key={item.codigo} className="min-w-24 text-center"><span className="block text-[10px] text-muted-foreground">{item.codigo}</span>{item.rotulo}</TableHead>)}
                  <TableHead>DTP</TableHead><TableHead>Hep. B</TableHead><TableHead>Hib</TableHead><TableHead>Polio</TableHead><TableHead>Tríplice</TableHead><TableHead>Pneumo</TableHead><TableHead>Pontuação</TableHead><TableHead>Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daPagina.map((crianca) => (
                  <TableRow key={crianca.id} className="[content-visibility:auto]">
                    <TableCell className="sticky left-0 z-[1] max-w-56 border-r bg-background font-medium"><span className="block truncate" title={crianca.nome_cidadao}>{crianca.nome_cidadao}</span></TableCell>
                    <TableCell>{crianca.equipe_nome ?? "—"}</TableCell><TableCell>{crianca.micro_area ?? "—"}</TableCell><TableCell>{formatarData(crianca.data_nascimento)}</TableCell>
                    {PRATICAS.map((pratica) => <TableCell key={pratica.codigo} className="text-center">{valorPratica(crianca, pratica.codigo)}</TableCell>)}
                    <TableCell>{crianca.vacina_dtp_doses}/3</TableCell><TableCell>{crianca.vacina_hepatite_b_doses}/3</TableCell><TableCell>{crianca.vacina_hib_doses}/3</TableCell><TableCell>{crianca.vacina_polio_doses}/3</TableCell><TableCell>{crianca.vacina_triplice_viral_doses}/2</TableCell><TableCell>{crianca.vacina_pneumococica_doses}/2</TableCell><TableCell><Badge>{crianca.pontuacao_total}</Badge></TableCell><TableCell>{formatarData(crianca.data_referencia)}</TableCell>
                  </TableRow>
                ))}
                {filtradas.length === 0 ? <TableRow><TableCell colSpan={17} className="h-24 text-center text-muted-foreground">Nenhuma criança corresponde aos filtros.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </Card>
          <Paginacao atual={paginaAtual} total={totalPaginas} onChange={setPagina} />
        </>
      ) : null}
    </div>
  );
}
