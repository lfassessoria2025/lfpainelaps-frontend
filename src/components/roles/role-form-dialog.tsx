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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/permission-labels";
import type { Permission, RoleCreate, RoleOut } from "@/lib/api-types";
import { permissionsService } from "@/services/roles";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleOut | null;
  onSubmit: (values: RoleCreate) => Promise<void>;
}

function buildDisplayGroups(catalog: Permission[]) {
  const known = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions));
  const groups = PERMISSION_GROUPS.map((group) => ({
    label: group.label,
    permissions: group.permissions.filter((permission) => catalog.includes(permission)),
  })).filter((group) => group.permissions.length > 0);
  const outras = catalog.filter((permission) => !known.has(permission));
  if (outras.length > 0) groups.push({ label: "Outras", permissions: outras });
  return groups;
}

export function RoleFormDialog({ open, onOpenChange, role, onSubmit }: RoleFormDialogProps) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [catalog, setCatalog] = useState<Permission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setPermissions(new Set(role?.permissions ?? []));
    setError(null);
    void permissionsService
      .catalog()
      .then((result) => setCatalog(result.permissions))
      .catch(() => setCatalog(Object.keys(PERMISSION_LABELS) as Permission[]));
  }, [open, role]);

  function togglePermission(permission: Permission, checked: boolean) {
    setPermissions((current) => {
      const next = new Set(current);
      if (checked) next.add(permission);
      else next.delete(permission);
      return next;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Informe o nome do cargo.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), permissions: Array.from(permissions) });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cargo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Editar cargo" : "Novo cargo"}</DialogTitle>
          <DialogDescription>
            O cargo define o que a pessoa pode fazer. Prefeitura e equipes são escolhidas na lotação do funcionário.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="role-name">Nome do cargo</FieldLabel>
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            {catalog === null ? <Spinner /> : buildDisplayGroups(catalog).map((group) => (
              <FieldSet key={group.label}>
                <FieldLegend variant="label">{group.label}</FieldLegend>
                <div className="flex flex-col gap-2">
                  {group.permissions.map((permission) => (
                    <label key={permission} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={permissions.has(permission)}
                        onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                      />
                      {PERMISSION_LABELS[permission] ?? permission}
                    </label>
                  ))}
                </div>
              </FieldSet>
            ))}
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Salvar cargo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
