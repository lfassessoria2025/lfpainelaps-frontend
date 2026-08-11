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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { PrefeituraOut, UserSummaryOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { prefeiturasService } from "@/services/prefeituras";
import { usersService } from "@/services/users";

interface AssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefeituras: PrefeituraOut[];
}

export function AssignMemberDialog({ open, onOpenChange, prefeituras }: AssignMemberDialogProps) {
  const [users, setUsers] = useState<UserSummaryOut[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserId("");
    setSelected(new Set());
    setError(null);

    const controller = new AbortController();
    setIsLoadingUsers(true);
    usersService
      .list(controller.signal)
      .then((data) => setUsers(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError("Não foi possível carregar a lista de usuários.");
        }
      })
      .finally(() => setIsLoadingUsers(false));

    return () => controller.abort();
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
    if (!userId) {
      setError("Selecione um usuário.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await prefeiturasService.setMembers(Number(userId), {
        prefeitura_ids: Array.from(selected),
      });
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
            <FieldLabel htmlFor="assign-user">Usuário</FieldLabel>
            <Select value={userId} onValueChange={(value) => setUserId(value ?? "")}>
              <SelectTrigger id="assign-user" className="w-full">
                <SelectValue
                  placeholder={isLoadingUsers ? "Carregando…" : "Selecione um usuário"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.email}
                      {user.status !== "ativo" ? ` (${user.status})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
