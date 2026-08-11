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
import type { RoleOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { usersService } from "@/services/users";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOut[];
  onInvited?: () => void;
}

export function InviteUserDialog({ open, onOpenChange, roles, onInvited }: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitedToken, setInvitedToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setRoleId("none");
      setError(null);
      setInvitedToken(null);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const invitation = await usersService.invite({
        email,
        role_id: roleId === "none" ? null : Number(roleId),
      });
      setInvitedToken(invitation.token);
      onInvited?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível convidar o funcionário.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar funcionário</DialogTitle>
          <DialogDescription>
            O funcionário recebe um link para definir a própria senha.
          </DialogDescription>
        </DialogHeader>

        {invitedToken ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              Convite criado. Compartilhe o link abaixo com o funcionário (ele expira — envie por
              um canal seguro):
            </p>
            <code className="break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {`${window.location.origin}/accept-invite?token=${invitedToken}`}
            </code>
          </div>
        ) : (
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Cargo</FieldLabel>
              <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "none")}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder="Sem cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Sem cargo</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Pode ser atribuído depois.</FieldDescription>
            </Field>
          </FieldGroup>
        )}

        <DialogFooter>
          {invitedToken ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !email}>
                {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                Convidar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
