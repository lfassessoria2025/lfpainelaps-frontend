import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/http";
import { importacoesService } from "@/services/importacoes";

interface NewImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefeituraId: number;
  onCompleted: () => void;
}

type Step = "form" | "starting" | "uploading" | "confirming";

const STEP_LABEL: Record<Step, string> = {
  form: "",
  starting: "Registrando importação…",
  uploading: "Enviando arquivo…",
  confirming: "Confirmando upload…",
};

export function NewImportDialog({
  open,
  onOpenChange,
  prefeituraId,
  onCompleted,
}: NewImportDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");

  useEffect(() => {
    if (open) {
      setDisplayName("");
      setFile(null);
      setError(null);
      setStep("form");
    }
  }, [open]);

  async function handleSubmit() {
    if (!displayName.trim()) {
      setError("Informe um nome para identificar esta importação.");
      return;
    }
    if (!file) {
      setError("Selecione o arquivo de backup (dump).");
      return;
    }
    setError(null);

    try {
      setStep("starting");
      const importacao = await importacoesService.start(prefeituraId, {
        display_name: displayName,
        expected_size_bytes: file.size,
      });

      setStep("uploading");
      const instructions = await importacoesService.uploadInstructions(
        prefeituraId,
        importacao.id,
      );
      await importacoesService.uploadFile(instructions, file);

      setStep("confirming");
      await importacoesService.confirmUpload(prefeituraId, importacao.id);

      onOpenChange(false);
      onCompleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível enviar o arquivo.");
      setStep("form");
    }
  }

  const isBusy = step !== "form";

  return (
    <Dialog open={open} onOpenChange={(next) => !isBusy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova importação</DialogTitle>
          <DialogDescription>
            Envie o backup semanal (dump PostgreSQL) desta prefeitura.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="import-name">Nome da importação</FieldLabel>
            <Input
              id="import-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="ex.: Backup semana 32"
              disabled={isBusy}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="import-file">Arquivo do dump</FieldLabel>
            <Input
              id="import-file"
              type="file"
              disabled={isBusy}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <FieldDescription>
              {file
                ? `${file.name} — ${(file.size / 1024 / 1024).toFixed(1)} MB`
                : "Nenhum arquivo selecionado."}
            </FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? <Spinner data-icon="inline-start" /> : null}
            {isBusy ? STEP_LABEL[step] : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
