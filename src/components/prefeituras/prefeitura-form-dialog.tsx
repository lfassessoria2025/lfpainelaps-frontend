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
import type { PrefeituraOut } from "@/lib/api-types";

interface PrefeituraFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefeitura: PrefeituraOut | null;
  onSubmit: (values: { ibge_code?: string; name: string }) => Promise<void>;
}

const IBGE_PATTERN = /^\d{7}$/;

export function PrefeituraFormDialog({
  open,
  onOpenChange,
  prefeitura,
  onSubmit,
}: PrefeituraFormDialogProps) {
  const [ibgeCode, setIbgeCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(prefeitura);

  useEffect(() => {
    if (open) {
      setIbgeCode(prefeitura?.ibge_code ?? "");
      setName(prefeitura?.name ?? "");
      setError(null);
    }
  }, [open, prefeitura]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Informe o nome da prefeitura.");
      return;
    }
    if (!isEditing && !IBGE_PATTERN.test(ibgeCode)) {
      setError("Código IBGE deve ter exatamente 7 dígitos.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(isEditing ? { name } : { ibge_code: ibgeCode, name });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a prefeitura.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar prefeitura" : "Nova prefeitura"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "O código IBGE não pode ser alterado após o cadastro."
              : "Cadastre a prefeitura pelo código IBGE do município."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {!isEditing ? (
            <Field data-invalid={Boolean(error) && !IBGE_PATTERN.test(ibgeCode)}>
              <FieldLabel htmlFor="ibge-code">Código IBGE</FieldLabel>
              <Input
                id="ibge-code"
                value={ibgeCode}
                onChange={(event) => setIbgeCode(event.target.value.replace(/\D/g, ""))}
                maxLength={7}
                inputMode="numeric"
              />
              <FieldDescription>7 dígitos, ex.: 3550308.</FieldDescription>
            </Field>
          ) : null}
          <Field data-invalid={Boolean(error) && !name.trim()}>
            <FieldLabel htmlFor="prefeitura-name">Nome</FieldLabel>
            <Input
              id="prefeitura-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
