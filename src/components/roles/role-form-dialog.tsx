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
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/permission-labels";
import type { Permission, RoleOut } from "@/lib/api-types";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleOut | null;
  onSubmit: (values: { name: string; permissions: Permission[] }) => Promise<void>;
}

export function RoleFormDialog({ open, onOpenChange, role, onSubmit }: RoleFormDialogProps) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setPermissions(new Set(role?.permissions ?? []));
      setError(null);
    }
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
      await onSubmit({ name, permissions: Array.from(permissions) });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cargo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? "Editar cargo" : "Novo cargo"}</DialogTitle>
          <DialogDescription>
            Defina o nome e as permissões que este cargo concede aos funcionários.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="role-name">Nome do cargo</FieldLabel>
            <Input
              id="role-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(error)}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>

          <div className="flex max-h-80 flex-col gap-4 overflow-y-auto pr-1">
            {PERMISSION_GROUPS.map((group) => (
              <FieldSet key={group.label}>
                <FieldLegend variant="label">{group.label}</FieldLegend>
                <div className="flex flex-col gap-2">
                  {group.permissions.map((permission) => (
                    <label
                      key={permission}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={permissions.has(permission)}
                        onCheckedChange={(checked) =>
                          togglePermission(permission, checked === true)
                        }
                      />
                      {PERMISSION_LABELS[permission]}
                    </label>
                  ))}
                </div>
              </FieldSet>
            ))}
          </div>
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
