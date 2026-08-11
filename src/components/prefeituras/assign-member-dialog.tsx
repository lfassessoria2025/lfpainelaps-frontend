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
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { prefeiturasService } from "@/services/prefeituras";

interface AssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefeituras: PrefeituraOut[];
}

/**
 * Não existe `GET /users` no contrato atual — a UI pede o ID do usuário
 * diretamente (o admin já sabe quem convidou). Quando o backend ganhar uma
 * listagem de usuários, trocar o input por um combobox.
 */
export function AssignMemberDialog({ open, onOpenChange, prefeituras }: AssignMemberDialogProps) {
  const [userId, setUserId] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setUserId("");
      setSelected(new Set());
      setError(null);
    }
  }, [open]);

  function toggle(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit() {
    const parsedId = Number(userId);
    if (!userId || Number.isNaN(parsedId)) {
      setError("Informe o ID numérico do usuário.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await prefeiturasService.setMembers(parsedId, { prefeitura_ids: Array.from(selected) });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível atribuir prefeituras.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir prefeituras a um usuário</DialogTitle>
          <DialogDescription>
            Define exatamente o conjunto de prefeituras que este usuário pode acessar.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="user-id">ID do usuário</FieldLabel>
            <Input
              id="user-id"
              inputMode="numeric"
              value={userId}
              onChange={(event) => setUserId(event.target.value.replace(/\D/g, ""))}
              aria-invalid={Boolean(error)}
            />
            <FieldDescription>
              Retornado no convite (Cargos e permissões → Convidar funcionário).
            </FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel>Prefeituras</FieldLabel>
            <div className="flex flex-col gap-2">
              {prefeituras.map((prefeitura) => (
                <label
                  key={prefeitura.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    checked={selected.has(prefeitura.id)}
                    onCheckedChange={(checked) => toggle(prefeitura.id, checked === true)}
                  />
                  {prefeitura.name}
                </label>
              ))}
            </div>
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
