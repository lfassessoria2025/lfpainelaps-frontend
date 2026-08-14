import { useCallback, useEffect, useState } from "react";
import { Baby, Download, Loader2, Lock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { PRATICAS, statusDaPratica, type StatusPratica } from "@/lib/gestante-praticas";
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

export function GestantesPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [gestantes, setGestantes] = useState<GestanteAcompanhamentoOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
          <Card className="gap-0 overflow-x-auto border-border/60 py-0 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="sticky left-0 z-10 bg-muted/40">Gestante</TableHead>
                  <TableHead>Equipe</TableHead>
                  {PRATICAS.map((pratica) => (
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
                  <TableHead className="text-right">Pontuação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestantes.map((gestante) => (
                  <TableRow key={gestante.id}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium">
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
                    {PRATICAS.map((pratica) => {
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
                    <TableCell className="text-right">
                      <Badge className="tabular-nums">{gestante.pontuacao_total}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
