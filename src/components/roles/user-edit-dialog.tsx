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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { PrefeituraOut, RoleOut, UserManagementUpdate, UserSummaryOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { usersService } from "@/services/users";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummaryOut | null;
  roles: RoleOut[];
  prefeituras: PrefeituraOut[];
  canAssignPrefeituras: boolean;
  onSaved: () => void | Promise<void>;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  roles,
  prefeituras,
  canAssignPrefeituras,
  onSaved,
}: UserEditDialogProps) {
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("none");
  const [prefeituraIds, setPrefeituraIds] = useState<Set<number>>(new Set());
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedName = name.trim();
  const selectedRoleId = roleId === "none" ? null : Number(roleId);
  const sortedPrefeituraIds = Array.from(prefeituraIds).toSorted((a, b) => a - b);
  const originalPrefeituraIds = user?.prefeitura_ids.toSorted((a, b) => a - b) ?? [];
  const prefeiturasChanged =
    canAssignPrefeituras &&
    (sortedPrefeituraIds.length !== originalPrefeituraIds.length ||
      sortedPrefeituraIds.some((id, index) => id !== originalPrefeituraIds[index]));
  const hasChanges = Boolean(
    user &&
      (normalizedName !== (user.name ?? "") ||
        (!user.is_admin && selectedRoleId !== user.role_id) ||
        prefeiturasChanged),
  );

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name ?? "");
    setRoleId(user.role_id === null ? "none" : String(user.role_id));
    setPrefeituraIds(new Set(user.prefeitura_ids));
    setMotivo("");
    setError(null);
  }, [open, user]);

  function togglePrefeitura(id: number, checked: boolean) {
    setPrefeituraIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!user || !normalizedName || motivo.trim().length < 3) {
      setError("Informe o nome e o motivo da alteração.");
      return;
    }
    if (!hasChanges) {
      setError("Faça ao menos uma alteração antes de salvar.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const payload: UserManagementUpdate = {
      motivo: motivo.trim(),
      ...(normalizedName !== (user.name ?? "") ? { name: normalizedName } : {}),
      ...(!user.is_admin && selectedRoleId !== user.role_id ? { role_id: selectedRoleId } : {}),
      ...(prefeiturasChanged ? { prefeitura_ids: sortedPrefeituraIds } : {}),
    };
    try {
      await usersService.update(user.id, payload);
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível atualizar o usuário.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Altere o cadastro e o escopo de acesso. Reduções relevantes revogam as sessões no backend.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="edit-user-name">Nome</FieldLabel>
            <Input
              id="edit-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-user-role">Cargo</FieldLabel>
            {user?.is_admin ? (
              <>
                <Input id="edit-user-role" value="Administrador" disabled />
                <FieldDescription>O administrador não recebe cargo por esta tela.</FieldDescription>
              </>
            ) : (
              <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "none")}>
                <SelectTrigger id="edit-user-role" className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value && value !== "none"
                        ? (roles.find((role) => String(role.id) === value)?.name ?? "Sem cargo")
                        : "Sem cargo"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Sem cargo</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
          {canAssignPrefeituras ? (
            <Field>
              <FieldLabel>Prefeituras permitidas</FieldLabel>
              <div className="flex flex-col gap-2">
                {prefeituras.map((prefeitura) => (
                  <label key={prefeitura.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={prefeituraIds.has(prefeitura.id)}
                      onCheckedChange={(checked) => togglePrefeitura(prefeitura.id, checked === true)}
                    />
                    {prefeitura.name}
                  </label>
                ))}
              </div>
              <FieldDescription>O backend valida se você pode atribuir cada prefeitura.</FieldDescription>
            </Field>
          ) : null}
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="edit-user-reason">Motivo da alteração</FieldLabel>
            <Input
              id="edit-user-reason"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              aria-invalid={Boolean(error)}
              placeholder="Ex.: mudança de função ou unidade"
            />
            <FieldDescription>O motivo será registrado na auditoria.</FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !normalizedName || motivo.trim().length < 3 || !hasChanges}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
