import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Baby, Download, Loader2, Lock, Search, ShieldAlert } from "lucide-react";
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
import type { GestanteAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";
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

type StatusFiltro = StatusPratica | "todos";
type Ordenacao = "nome-asc" | "pontuacao-desc" | "pontuacao-asc";
type PresetColunas = "essenciais" | "todos";

export function GestantesPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [gestantes, setGestantes] = useState<GestanteAcompanhamentoOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const buscaDeferred = useDeferredValue(busca);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome-asc");
  const [presetColunas, setPresetColunas] = useState<PresetColunas>("essenciais");

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

  const loadGestantes = useCallback(async () => {
    if (selectedId === null) return;
    try {
      const data = await gestanteService.list(selectedId);
      setGestantes(data);
      setLoadError(null);
      setForbidden(false);
    } catch (err) {
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
  }, [selectedId]);

  useEffect(() => {
    setGestantes(null);
    setForbidden(false);
    void loadGestantes();
  }, [loadGestantes]);

  const handleExportar = useCallback(async () => {
    if (selectedId === null) return;
    setExportando(true);
    setExportError(null);
    try {
      const { blob, filename } = await gestanteService.exportar(selectedId);
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
  }, [selectedId]);

  const podeExportar = !forbidden && !loadError && gestantes !== null && gestantes.length > 0;
  const gestantesFiltradas = useMemo(() => {
    if (!gestantes) return [];
    const termo = buscaDeferred.trim().toLocaleLowerCase("pt-BR");
    const resultado = gestantes.filter((gestante) => {
      const correspondeBusca =
        termo.length === 0 ||
        gestante.nome_cidadao.toLocaleLowerCase("pt-BR").includes(termo) ||
        (gestante.equipe_nome ?? "").toLocaleLowerCase("pt-BR").includes(termo) ||
        (gestante.equipe_ine ?? "").toLocaleLowerCase("pt-BR").includes(termo);
      const correspondeStatus =
        statusFiltro === "todos" || statusGeralDaGestante(gestante) === statusFiltro;
      return correspondeBusca && correspondeStatus;
    });

    return resultado.toSorted((a, b) => {
      if (ordenacao === "pontuacao-desc") return b.pontuacao_total - a.pontuacao_total;
      if (ordenacao === "pontuacao-asc") return a.pontuacao_total - b.pontuacao_total;
      return a.nome_cidadao.localeCompare(b.nome_cidadao, "pt-BR");
    });
  }, [buscaDeferred, gestantes, ordenacao, statusFiltro]);

  return (
    <div>
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
      ) : gestantes.length === 0 ? (
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
                    placeholder="Nome, equipe ou INE"
                    className="pl-8"
                  />
                </div>
              </label>
              <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-muted-foreground">
                Status do acompanhamento
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
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <strong className="font-semibold text-foreground">{gestantesFiltradas.length}</strong>{" "}
                de {gestantes.length} gestantes
              </p>
              <Tabs
                value={presetColunas}
                onValueChange={(value) => setPresetColunas(value as PresetColunas)}
              >
                <TabsList aria-label="Colunas visíveis">
                  <TabsTrigger value="essenciais">Essenciais</TabsTrigger>
                  <TabsTrigger value="todos">Todos os parâmetros</TabsTrigger>
                </TabsList>
              </Tabs>
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
          <div className="relative">
            {/* Sombras de affordance — indicam que há mais colunas fora da
                tela, sem precisar descobrir arrastando por acaso (FLO-41).
                z-[2]: acima da coluna sticky (z-[1]), abaixo da sidebar
                (z-10, mesma regra do FLO-40). */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 bg-gradient-to-r from-card to-transparent opacity-0 transition-opacity duration-150",
                scrollAffordance.mostrarSombraEsquerda && "opacity-100",
              )}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-[2] w-10 bg-gradient-to-l from-card to-transparent opacity-0 transition-opacity duration-150",
                scrollAffordance.mostrarSombraDireita && "opacity-100",
              )}
            />
            <Card
              ref={scrollRef}
              onScroll={atualizarScrollAffordance}
              className="gap-0 overflow-x-auto border-border/60 py-0 shadow-sm"
            >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="sticky left-0 z-[1] bg-muted/40">Gestante</TableHead>
                  <TableHead>Equipe</TableHead>
                  {presetColunas === "todos" ? (
                    <>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>INE</TableHead>
                      <TableHead>Início gestação</TableHead>
                      <TableHead>Fim gestação</TableHead>
                      <TableHead>Fim puerpério</TableHead>
                      <TableHead>Elegibilidade</TableHead>
                    </>
                  ) : null}
                  <TableHead>Status</TableHead>
                  {presetColunas === "todos" ? PRATICAS.map((pratica) => (
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
                  )) : null}
                  <TableHead className="text-right">Pontuação</TableHead>
                  {presetColunas === "todos" ? <TableHead>Atualizado em</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestantesFiltradas.map((gestante) => {
                  const statusGeral = statusGeralDaGestante(gestante);
                  return (
                  <TableRow key={gestante.id}>
                    <TableCell className="sticky left-0 z-[1] bg-background font-medium">
                      <div className="flex flex-col">
                        <span>{gestante.nome_cidadao}</span>
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
                    <TableCell className="text-muted-foreground">
                      {gestante.equipe_nome ?? "—"}
                    </TableCell>
                    {presetColunas === "todos" ? (
                      <>
                        <TableCell>{formatDate(gestante.data_nascimento)}</TableCell>
                        <TableCell className="font-mono text-xs">{gestante.equipe_ine ?? "—"}</TableCell>
                        <TableCell>{formatDate(gestante.dt_inicio_gestacao)}</TableCell>
                        <TableCell>{formatDate(gestante.dt_fim_gestacao)}</TableCell>
                        <TableCell>{formatDate(gestante.dt_fim_puerperio)}</TableCell>
                        <TableCell>{gestante.excluida_por_aborto ? "Excluída (aborto)" : "Incluída"}</TableCell>
                      </>
                    ) : null}
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASSNAME[statusGeral]}>
                        {STATUS_PRATICA_ROTULO[statusGeral]}
                      </Badge>
                    </TableCell>
                    {presetColunas === "todos" ? PRATICAS.map((pratica) => {
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
                    }) : null}
                    <TableCell className="text-right">
                      <Badge className="tabular-nums">{gestante.pontuacao_total}</Badge>
                    </TableCell>
                    {presetColunas === "todos" ? (
                      <TableCell>{formatDateTime(gestante.created_at)}</TableCell>
                    ) : null}
                  </TableRow>
                  );
                })}
                {gestantesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={presetColunas === "todos" ? PRATICAS.length + 11 : 4}
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
        </>
      )}
    </div>
  );
}
