import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Pencil, Plus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NewImportDialog } from "@/components/importacoes/new-import-dialog";
import { ImportProcessingTimeline } from "@/components/importacoes/import-processing-timeline";
import { PageHeader } from "@/components/layout/page-header";
import {
  IMPORTACAO_STATUS_EXCLUIVEL,
  IMPORTACAO_STATUS_INFO,
  explicarFalha,
} from "@/lib/importacao-status";
import { IMPORTACAO_STATUS_EM_ANDAMENTO } from "@/lib/api-types";
import type { ImportacaoOut, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { importacoesService } from "@/services/importacoes";
import { prefeiturasService } from "@/services/prefeituras";

const POLL_INTERVAL_MS = 5000;

// ImportacaoOut não carrega o id da prefeitura (é implícito na URL) — a tela
// precisa dele para montar as chamadas de renomear/excluir/continuar.
type ImportacaoComPrefeitura = ImportacaoOut & { prefeituraId: number };

function RenameImportDialog({
  importacao,
  onOpenChange,
  onRenamed,
}: {
  importacao: ImportacaoComPrefeitura;
  onOpenChange: (open: boolean) => void;
  onRenamed: () => void;
}) {
  const [nome, setNome] = useState(importacao.display_name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!nome.trim()) {
      setError("Informe um nome.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await importacoesService.rename(importacao.prefeituraId, importacao.id, nome.trim());
      onRenamed();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível renomear.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Renomear importação</DialogTitle>
          <DialogDescription>Só o rótulo muda; o processamento não é afetado.</DialogDescription>
        </DialogHeader>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="rename-import">Nome</FieldLabel>
          <Input
            id="rename-import"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            aria-invalid={Boolean(error)}
            autoFocus
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteImportDialog({
  importacao,
  onOpenChange,
  onDeleted,
}: {
  importacao: ImportacaoComPrefeitura;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      await importacoesService.remove(importacao.prefeituraId, importacao.id);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível excluir.");
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir importação</AlertDialogTitle>
          <AlertDialogDescription>
            "{importacao.display_name}" vai sumir da lista. Se ela estava bloqueando novos envios
            para esta prefeitura, o bloqueio é liberado. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ImportacoesPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [imports, setImports] = useState<ImportacaoOut[] | null>(null);
  const [importsUpdatedAt, setImportsUpdatedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newImportOpen, setNewImportOpen] = useState(false);
  const [resumeTarget, setResumeTarget] = useState<ImportacaoComPrefeitura | null>(null);
  const [renameTarget, setRenameTarget] = useState<ImportacaoComPrefeitura | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImportacaoComPrefeitura | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

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
      setImportsUpdatedAt(new Date());
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.detail : "Não foi possível carregar as importações.",
      );
    }
  }, [selectedId]);

  useEffect(() => {
    setImports(null);
    setImportsUpdatedAt(null);
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

  async function retryImport(importacao: ImportacaoComPrefeitura) {
    setRetryingId(importacao.id);
    setLoadError(null);
    try {
      await importacoesService.retry(importacao.prefeituraId, importacao.id);
      await loadImports();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.detail : "Não foi possível retomar a importação.");
    } finally {
      setRetryingId(null);
    }
  }

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
          <Card className="gap-0 border-border/60 py-0 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((importacao) => {
                  const statusInfo = IMPORTACAO_STATUS_INFO[importacao.status];
                  const falha = explicarFalha(importacao.last_failure_code);
                  const comPrefeitura: ImportacaoComPrefeitura | null =
                    selectedId === null ? null : { ...importacao, prefeituraId: selectedId };
                  const podeExcluir = IMPORTACAO_STATUS_EXCLUIVEL.has(importacao.status);
                  const podeContinuar = importacao.status === "aguardando_upload";
                  const podeRepetir = importacao.status === "falhou";
                  return (
                    <Fragment key={importacao.id}>
                      <TableRow>
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
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {podeContinuar && comPrefeitura ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResumeTarget(comPrefeitura)}
                              >
                                Continuar envio
                              </Button>
                            ) : null}
                            {podeRepetir && comPrefeitura ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={retryingId === importacao.id}
                                onClick={() => void retryImport(comPrefeitura)}
                              >
                                {retryingId === importacao.id ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                                Tentar novamente
                              </Button>
                            ) : null}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Renomear ${importacao.display_name}`}
                                    disabled={!comPrefeitura}
                                    onClick={() => comPrefeitura && setRenameTarget(comPrefeitura)}
                                  />
                                }
                              >
                                <Pencil />
                              </TooltipTrigger>
                              <TooltipContent>Renomear</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Excluir ${importacao.display_name}`}
                                    disabled={!podeExcluir || !comPrefeitura}
                                    onClick={() => comPrefeitura && setDeleteTarget(comPrefeitura)}
                                  />
                                }
                              >
                                <Trash2 className={podeExcluir ? "text-destructive" : undefined} />
                              </TooltipTrigger>
                              <TooltipContent>
                                {podeExcluir
                                  ? "Excluir"
                                  : "Só é possível excluir enquanto aguarda envio, com falha ou expirada"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="bg-muted/20 py-3">
                          <ImportProcessingTimeline status={importacao.status} updatedAt={importsUpdatedAt} />
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <Alert className="border-border/60 shadow-sm">
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

      {resumeTarget ? (
        <NewImportDialog
          open
          onOpenChange={(open) => !open && setResumeTarget(null)}
          prefeituraId={resumeTarget.prefeituraId}
          resumeImport={resumeTarget}
          onCompleted={() => {
            setResumeTarget(null);
            void loadImports();
          }}
        />
      ) : null}

      {renameTarget ? (
        <RenameImportDialog
          importacao={renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          onRenamed={() => void loadImports()}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteImportDialog
          importacao={deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onDeleted={() => void loadImports()}
        />
      ) : null}
    </div>
  );
}
