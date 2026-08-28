import { useEffect, useState } from "react";
import { CloudUpload, FileCheck2, MapPin, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";
import type { ImportacaoOut, PrefeituraOut } from "@/lib/api-types";
import { importacoesService } from "@/services/importacoes";

interface NewImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefeituraId: number;
  prefeitura: Pick<PrefeituraOut, "name" | "ibge_code">;
  onCompleted: () => void;
  /** Quando presente, reenvia o arquivo para uma importação já registrada e
   * travada em "aguardando envio" (ex.: aba fechada no meio do upload),
   * em vez de criar um registro novo — a mesma prefeitura só aceita uma
   * importação ativa por vez, então "nova" bloquearia com 409. */
  resumeImport?: ImportacaoOut | null;
}

type Step = "form" | "starting" | "uploading" | "confirming";

const STEP_LABEL: Record<Exclude<Step, "form">, string> = {
  starting: "Registrando importação…",
  uploading: "Enviando arquivo…",
  confirming: "Confirmando upload…",
};

const MULTIPART_CONCURRENCY = 3;

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function partBounds(partNumber: number, partSize: number, fileSize: number) {
  const start = (partNumber - 1) * partSize;
  return { start, end: Math.min(start + partSize, fileSize) };
}

export function NewImportDialog({
  open,
  onOpenChange,
  prefeituraId,
  prefeitura,
  onCompleted,
  resumeImport = null,
}: NewImportDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [progresso, setProgresso] = useState(0);
  const [destinationConfirmed, setDestinationConfirmed] = useState(false);
  const [confirmationIbgeCode, setConfirmationIbgeCode] = useState("");

  useEffect(() => {
    if (open) {
      setDisplayName(resumeImport?.display_name ?? "");
      setFile(null);
      setError(null);
      setStep("form");
      setProgresso(0);
      setDestinationConfirmed(false);
      setConfirmationIbgeCode("");
    }
  }, [open, resumeImport]);

  async function handleSubmit() {
    if (!resumeImport && !displayName.trim()) {
      setError("Informe um nome para identificar esta importação.");
      return;
    }
    if (!file) {
      setError("Selecione o arquivo de backup (dump).");
      return;
    }
    if (!resumeImport && !destinationConfirmed) {
      setError("Confirme que o backup pertence à prefeitura indicada.");
      return;
    }
    if (!resumeImport && confirmationIbgeCode !== prefeitura.ibge_code) {
      setError("Digite exatamente o código IBGE da prefeitura indicada.");
      return;
    }
    const selectedFile = file;
    if (resumeImport && selectedFile.size !== resumeImport.expected_size_bytes) {
      setError("O arquivo selecionado tem tamanho diferente do backup que estava sendo enviado.");
      return;
    }
    setError(null);
    setProgresso(0);

    try {
      const importId = resumeImport
        ? resumeImport.id
        : await (async () => {
            setStep("starting");
            const importacao = await importacoesService.start(prefeituraId, {
              display_name: displayName,
              expected_size_bytes: selectedFile.size,
              destination_confirmation_ibge_code: confirmationIbgeCode,
            });
            return importacao.id;
          })();

      setStep("uploading");
      const session = resumeImport
        ? await importacoesService.getMultipart(prefeituraId, importId)
        : await importacoesService.startMultipart(prefeituraId, importId);
      if (!session.part_size_bytes || !session.total_parts) {
        throw new Error("A sessão de envio retornou dados inválidos.");
      }

      // Depois de refresh, não dependemos de estado no navegador.
      // A sessão no backend/R2 é a fonte de verdade: cada accepted_part já vem
      // com o ETag necessário para completar sem reenviar esta parte. URLs
      // pré-assinadas e identificadores da sessão opaca nunca são persistidos.
      const etags = new Map(
        session.accepted_parts.map(({ part_number, etag }) => [part_number, etag]),
      );

      const uploaded = new Set(etags.keys());
      let bytesSent = 0;
      for (const partNumber of uploaded) {
        const bounds = partBounds(partNumber, session.part_size_bytes, selectedFile.size);
        bytesSent += bounds.end - bounds.start;
      }
      setProgresso(bytesSent / selectedFile.size);

      const pending: number[] = [];
      for (let partNumber = 1; partNumber <= session.total_parts; partNumber += 1) {
        if (!uploaded.has(partNumber)) pending.push(partNumber);
      }
      let next = 0;
      async function uploadNextPart() {
        while (next < pending.length) {
          const partNumber = pending[next++];
          const { start, end } = partBounds(partNumber, session.part_size_bytes, selectedFile.size);
          const size = end - start;
          let loaded = 0;
          const instructions = await importacoesService.uploadPartInstructions(
            prefeituraId,
            importId,
            partNumber,
          );
          const etag = await importacoesService.uploadPart(instructions, selectedFile.slice(start, end), (current) => {
            bytesSent += current - loaded;
            loaded = current;
            setProgresso(Math.min(1, bytesSent / selectedFile.size));
          });
          // Alguns navegadores não enviam o evento final de progresso.
          bytesSent += size - loaded;
          setProgresso(Math.min(1, bytesSent / selectedFile.size));
          etags.set(partNumber, etag);
        }
      }
      await Promise.all(Array.from({ length: Math.min(MULTIPART_CONCURRENCY, pending.length) }, uploadNextPart));

      setStep("confirming");
      await importacoesService.completeMultipart(
        prefeituraId,
        importId,
        [...etags.entries()]
          .map(([part_number, etag]) => ({ part_number, etag }))
          .sort((left, right) => left.part_number - right.part_number),
      );

      onOpenChange(false);
      onCompleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : (err as Error).message || "Não foi possível enviar o arquivo.");
      setStep("form");
    }
  }

  const isBusy = step !== "form";
  const percentual = Math.round(progresso * 100);
  // "uploading" tem progresso real (bytes enviados); starting/confirming são
  // rápidos e indeterminados — a barra assume 100% com o brilho animado em
  // vez de ficar parada num número que não significa nada ali.
  const indeterminado = step === "starting" || step === "confirming";
  const destinationIsConfirmed =
    destinationConfirmed && confirmationIbgeCode === prefeitura.ibge_code;

  return (
    <Dialog open={open} onOpenChange={(next) => !isBusy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{resumeImport ? "Continuar envio" : "Nova importação"}</DialogTitle>
          <DialogDescription>
            {resumeImport
              ? `Selecione novamente o arquivo de "${resumeImport.display_name}" para retomar o envio.`
              : "Envie o backup semanal (dump PostgreSQL) desta prefeitura."}
          </DialogDescription>
        </DialogHeader>

        {isBusy ? (
          <div className="flex flex-col items-center gap-5 py-6">
            <div className="relative flex size-20 items-center justify-center">
              <div
                className={cn(
                  "absolute inset-0 rounded-full bg-primary/15",
                  "animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite]",
                )}
              />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
                {step === "confirming" ? (
                  <FileCheck2 className="size-7 text-primary" />
                ) : (
                  <CloudUpload className="size-7 animate-bounce text-primary [animation-duration:1.6s]" />
                )}
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-1">
              <p className="text-sm font-medium text-foreground">{STEP_LABEL[step]}</p>
              {step === "uploading" && file ? (
                <p className="text-xs text-muted-foreground">
                  {formatMegabytes(progresso * file.size)} de {formatMegabytes(file.size)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Isso pode levar alguns minutos — não feche esta janela.
                </p>
              )}
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <Progress value={indeterminado ? null : percentual} className="w-full">
                <ProgressTrack>
                  <ProgressIndicator />
                </ProgressTrack>
              </Progress>
              <span className="tabular-nums text-xs font-semibold text-primary">
                {indeterminado ? "" : `${percentual}%`}
              </span>
            </div>
          </div>
        ) : (
          <FieldGroup>
            {resumeImport ? null : (
              <>
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destino do backup</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{prefeitura.name}</p>
                      <p className="text-sm text-muted-foreground">Código IBGE: <span className="font-mono font-medium text-foreground">{prefeitura.ibge_code}</span></p>
                    </div>
                  </div>
                </div>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="import-name">Nome da importação</FieldLabel>
                  <Input
                    id="import-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="ex.: Backup semana 32"
                    aria-invalid={Boolean(error)}
                  />
                </Field>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="destination-confirmation-ibge">Confirme o código IBGE</FieldLabel>
                  <Input
                    id="destination-confirmation-ibge"
                    value={confirmationIbgeCode}
                    onChange={(event) => setConfirmationIbgeCode(event.target.value.replace(/\D/g, "").slice(0, 7))}
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="Digite os 7 dígitos"
                    aria-invalid={Boolean(error) && confirmationIbgeCode !== prefeitura.ibge_code}
                  />
                  <FieldDescription>Digite o código exibido acima para liberar o envio.</FieldDescription>
                </Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-3 text-sm">
                  <Checkbox
                    checked={destinationConfirmed}
                    onCheckedChange={(checked) => setDestinationConfirmed(checked === true)}
                    aria-label={`Confirmo que este backup pertence a ${prefeitura.name}`}
                  />
                  <span>
                    <span className="flex items-center gap-1 font-medium"><ShieldCheck className="size-4 text-primary" /> Confirmo o destino</span>
                    <span className="mt-1 block text-muted-foreground">Este backup será associado a {prefeitura.name}.</span>
                  </span>
                </label>
              </>
            )}
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="import-file">Arquivo do dump</FieldLabel>
              <Input
                id="import-file"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <FieldDescription>
                {file ? `${file.name} — ${formatMegabytes(file.size)}` : "Nenhum arquivo selecionado."}
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isBusy || (!resumeImport && !destinationIsConfirmed)}>
            {isBusy ? <Spinner data-icon="inline-start" /> : null}
            {isBusy ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
