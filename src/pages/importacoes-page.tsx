import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, UploadCloud } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { NewImportDialog } from "@/components/importacoes/new-import-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { IMPORTACAO_STATUS_INFO, explicarFalha } from "@/lib/importacao-status";
import { IMPORTACAO_STATUS_EM_ANDAMENTO } from "@/lib/api-types";
import type { ImportacaoOut, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { importacoesService } from "@/services/importacoes";
import { prefeiturasService } from "@/services/prefeituras";

const POLL_INTERVAL_MS = 5000;

export function ImportacoesPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [imports, setImports] = useState<ImportacaoOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newImportOpen, setNewImportOpen] = useState(false);

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

  const loadImports = useCallback(async () => {
    if (selectedId === null) return;
    try {
      const data = await importacoesService.list(selectedId);
      setImports(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.detail : "Não foi possível carregar as importações.",
      );
    }
  }, [selectedId]);

  useEffect(() => {
    setImports(null);
    void loadImports();
  }, [loadImports]);

  // Polling leve enquanto houver importação em andamento — evita o usuário
  // ter que ficar atualizando a página manualmente durante restauração.
  useEffect(() => {
    const emAndamento = imports?.some((imp) => IMPORTACAO_STATUS_EM_ANDAMENTO.has(imp.status));
    if (!emAndamento) return;
    const interval = setInterval(() => void loadImports(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [imports, loadImports]);

  return (
    <div>
      <PageHeader
        title="Importações"
        description="Envio do backup semanal e acompanhamento do processamento."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => void loadImports()} aria-label="Atualizar">
              <RefreshCw />
            </Button>
            <Button onClick={() => setNewImportOpen(true)} disabled={selectedId === null}>
              <Plus data-icon="inline-start" />
              Nova importação
            </Button>
          </>
        }
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
              <SelectValue placeholder="Selecione a prefeitura" />
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
          Cadastre uma prefeitura antes de iniciar uma importação.
        </p>
      ) : imports === null && !loadError ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : imports === null ? null : imports.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UploadCloud />
            </EmptyMedia>
            <EmptyTitle>Nenhuma importação ainda</EmptyTitle>
            <EmptyDescription>
              Envie o primeiro backup desta prefeitura para começar.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setNewImportOpen(true)}>
            <Plus data-icon="inline-start" />
            Nova importação
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((importacao) => {
                const statusInfo = IMPORTACAO_STATUS_INFO[importacao.status];
                const falha = explicarFalha(importacao.last_failure_code);
                return (
                  <TableRow key={importacao.id}>
                    <TableCell className="font-medium">{importacao.display_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={statusInfo.variant} className="w-fit">
                          {statusInfo.label}
                        </Badge>
                        {falha ? (
                          <span className="flex items-start gap-1 text-xs text-destructive">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                            {falha}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(importacao.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Alert>
            <AlertTriangle />
            <AlertTitle>Substituição segura</AlertTitle>
            <AlertDescription>
              O backup anterior desta prefeitura só é descartado depois que o novo for validado
              com sucesso.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {selectedId !== null ? (
        <NewImportDialog
          open={newImportOpen}
          onOpenChange={setNewImportOpen}
          prefeituraId={selectedId}
          onCompleted={() => void loadImports()}
        />
      ) : null}
    </div>
  );
}
