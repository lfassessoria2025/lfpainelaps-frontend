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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { UserAccessScopeEditor } from "@/components/roles/user-access-scope-editor";
import type {
  PrefeituraOut,
  RoleOut,
  UserAccessScopeIn,
  UserManagementUpdate,
  UserSummaryOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { usersService } from "@/services/users";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummaryOut | null;
  roles: RoleOut[];
  prefeituras: PrefeituraOut[];
  users: UserSummaryOut[];
  canAssignPrefeituras: boolean;
  onSaved: () => void | Promise<void>;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  roles,
  prefeituras,
  users,
  canAssignPrefeituras,
  onSaved,
}: UserEditDialogProps) {
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("none");
  const [scopes, setScopes] = useState<UserAccessScopeIn[]>([]);
  const [copyFrom, setCopyFrom] = useState("none");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedName = name.trim();
  const selectedRoleId = roleId === "none" ? null : Number(roleId);
  const serializeScopes = (values: UserAccessScopeIn[]) => JSON.stringify(
    values
      .map((scope) => ({ ...scope, team_keys: [...scope.team_keys].toSorted() }))
      .toSorted((a, b) => a.prefeitura_id - b.prefeitura_id),
  );
  const scopesChanged = canAssignPrefeituras
    && serializeScopes(scopes) !== serializeScopes(user?.access_scopes ?? []);
  const hasChanges = Boolean(
    user &&
      (normalizedName !== (user.name ?? "") ||
        (!user.is_admin && selectedRoleId !== user.role_id) ||
        scopesChanged),
  );

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name ?? "");
    setRoleId(user.role_id === null ? "none" : String(user.role_id));
    setScopes(user.access_scopes.map((scope) => ({
      prefeitura_id: scope.prefeitura_id,
      all_teams: scope.all_teams,
      team_keys: [...scope.team_keys],
    })));
    setCopyFrom("none");
    setMotivo("");
    setError(null);
  }, [open, user]);

  async function handleSubmit() {
    if (!user || !normalizedName || motivo.trim().length < 3) {
      setError("Informe o nome e o motivo da alteração.");
      return;
    }
    if (!hasChanges) {
      setError("Faça ao menos uma alteração antes de salvar.");
      return;
    }
    if (scopes.some((scope) => !scope.all_teams && scope.team_keys.length === 0)) {
      setError("Escolha ao menos uma equipe nas prefeituras selecionadas.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const payload: UserManagementUpdate = {
      motivo: motivo.trim(),
      ...(normalizedName !== (user.name ?? "") ? { name: normalizedName } : {}),
      ...(!user.is_admin && selectedRoleId !== user.role_id ? { role_id: selectedRoleId } : {}),
      ...(scopesChanged ? { access_scopes: scopes } : {}),
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
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto">
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
            <>
              <Field>
                <FieldLabel htmlFor="edit-copy-access">Copiar lotação de outro funcionário</FieldLabel>
                <Select
                  value={copyFrom}
                  onValueChange={(value) => {
                    const next = value ?? "none";
                    setCopyFrom(next);
                    const source = users.find((item) => String(item.id) === next);
                    if (source) setScopes(source.access_scopes.map((scope) => ({
                      prefeitura_id: scope.prefeitura_id,
                      all_teams: scope.all_teams,
                      team_keys: [...scope.team_keys],
                    })));
                  }}
                >
                  <SelectTrigger id="edit-copy-access" className="w-full">
                    <SelectValue placeholder="Manter lotação atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Manter lotação atual</SelectItem>
                      {users.filter((item) => item.id !== user?.id && !item.is_admin && item.access_scopes.length > 0).map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>{item.name || item.email}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>Use como modelo e ajuste as equipes abaixo.</FieldDescription>
              </Field>
              <UserAccessScopeEditor
                prefeituras={prefeituras}
                scopes={scopes}
                onChange={setScopes}
              />
            </>
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
