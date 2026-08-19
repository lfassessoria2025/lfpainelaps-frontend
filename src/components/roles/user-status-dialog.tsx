import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { UserSummaryOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { usersService } from "@/services/users";

export type UserStatusAction = "deactivate" | "reactivate" | "cancel-invitation";

const ACTION_COPY: Record<UserStatusAction, { title: string; description: string; button: string }> = {
  deactivate: {
    title: "Desativar usuário",
    description: "O acesso será bloqueado e todas as sessões serão revogadas imediatamente. A conta poderá ser reativada depois.",
    button: "Desativar e revogar sessões",
  },
  reactivate: {
    title: "Reativar usuário",
    description: "O usuário voltará a poder entrar com o cargo e o escopo de prefeituras cadastrados.",
    button: "Reativar usuário",
  },
  "cancel-invitation": {
    title: "Cancelar convite",
    description: "O link pendente deixará de funcionar. O convite não será convertido em conta ativa.",
    button: "Cancelar convite",
  },
};

interface UserStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummaryOut | null;
  action: UserStatusAction;
  onCompleted: () => void | Promise<void>;
}

export function UserStatusDialog({ open, onOpenChange, user, action, onCompleted }: UserStatusDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = ACTION_COPY[action];

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(null);
  }, [open, action]);

  async function handleConfirm() {
    if (!user || !motivo.trim()) {
      setError("Informe o motivo para continuar.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = { motivo: motivo.trim() };
      if (action === "deactivate") await usersService.deactivate(user.id, payload);
      else if (action === "reactivate") await usersService.reactivate(user.id, payload);
      else await usersService.cancelInvitation(user.id, payload);
      await onCompleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível concluir a ação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.description} Alvo: {user?.name || user?.email}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="user-status-reason">Motivo</FieldLabel>
          <Input
            id="user-status-reason"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            aria-invalid={Boolean(error)}
            placeholder="Registre por que esta ação é necessária"
          />
          <FieldDescription>O motivo ficará disponível na auditoria.</FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant={action === "reactivate" ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={isSubmitting || motivo.trim().length < 3}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {copy.button}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
