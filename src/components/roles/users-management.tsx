import { useCallback, useEffect, useState } from "react";
import { Pencil, RotateCcw, UserMinus, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteUserDialog } from "@/components/roles/invite-user-dialog";
import { UserEditDialog } from "@/components/roles/user-edit-dialog";
import { UserStatusDialog, type UserStatusAction } from "@/components/roles/user-status-dialog";
import type { PrefeituraOut, RoleOut, UserStatus, UserSummaryOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { prefeiturasService } from "@/services/prefeituras";
import { usersService } from "@/services/users";

const STATUS_COPY: Record<UserStatus, string> = {
  ativo: "Ativo",
  convidado: "Convite pendente",
  desativado: "Desativado",
};

function termStatus(user: UserSummaryOut) {
  if (!user.current_term_version) return "Sem termo vigente";
  if (!user.current_term_accepted_at) return `Versão ${user.current_term_version} · pendente`;
  const acceptedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(user.current_term_accepted_at),
  );
  return `Versão ${user.current_term_version} · ${acceptedAt}`;
}

interface UsersManagementProps {
  currentUserId: number;
  currentUserIsAdmin: boolean;
  roles: RoleOut[];
  canAssignPrefeituras: boolean;
}

export function UsersManagement({ currentUserId, currentUserIsAdmin, roles, canAssignPrefeituras }: UsersManagementProps) {
  const [users, setUsers] = useState<UserSummaryOut[] | null>(null);
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummaryOut | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserSummaryOut | null>(null);
  const [statusAction, setStatusAction] = useState<UserStatusAction>("deactivate");

  const loadUsers = useCallback(async () => {
    try {
      const data = await usersService.list();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível carregar os usuários.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void usersService
      .list(controller.signal)
      .then((data) => {
        setUsers(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.detail : "Não foi possível carregar os usuários.");
      });
    if (canAssignPrefeituras) {
      void prefeiturasService
        .list(controller.signal)
        .then(setPrefeituras)
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setPrefeituras([]);
        });
    }
    return () => controller.abort();
  }, [canAssignPrefeituras]);

  function openStatus(user: UserSummaryOut, action: UserStatusAction) {
    setStatusTarget(user);
    setStatusAction(action);
  }

  async function handleSaved(message: string) {
    await loadUsers();
    toast.success(message);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Usuários e convites</CardTitle>
          <CardDescription>Edite acessos, desative contas ou cancele convites pendentes.</CardDescription>
        </div>
        <Button variant="outline" onClick={() => setInviteOpen(true)}>
          <UserPlus data-icon="inline-start" />
          Convidar funcionário
        </Button>
      </CardHeader>
      <CardContent>
        {users === null && !error ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : users?.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><UserPlus /></EmptyMedia>
              <EmptyTitle>Nenhum usuário cadastrado</EmptyTitle>
              <EmptyDescription>Convide o primeiro funcionário para começar.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Prefeituras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Termo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((managedUser) => {
                const role = roles.find((item) => item.id === managedUser.role_id);
                const isSelf = managedUser.id === currentUserId;
                const canManageTarget = !managedUser.is_admin || currentUserIsAdmin;
                return (
                  <TableRow key={managedUser.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{managedUser.name || "Nome não informado"}</span>
                        <span className="truncate text-xs text-muted-foreground">{managedUser.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{managedUser.is_admin ? "Administrador" : role?.name ?? "Sem cargo"}</TableCell>
                    <TableCell>{managedUser.is_admin ? "Todas" : managedUser.prefeitura_ids.length}</TableCell>
                    <TableCell><Badge variant="secondary">{STATUS_COPY[managedUser.status]}</Badge></TableCell>
                    <TableCell>{termStatus(managedUser)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canManageTarget && !isSelf ? <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${managedUser.name || managedUser.email}`}
                          onClick={() => setEditingUser(managedUser)}
                        >
                          <Pencil />
                        </Button> : null}
                        {canManageTarget && managedUser.status === "ativo" && !isSelf ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Desativar ${managedUser.name || managedUser.email}`}
                            onClick={() => openStatus(managedUser, "deactivate")}
                          >
                            <UserMinus />
                          </Button>
                        ) : null}
                        {canManageTarget && managedUser.status === "desativado" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Reativar ${managedUser.name || managedUser.email}`}
                            onClick={() => openStatus(managedUser, "reactivate")}
                          >
                            <RotateCcw />
                          </Button>
                        ) : null}
                        {canManageTarget && managedUser.status === "convidado" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Cancelar convite de ${managedUser.name || managedUser.email}`}
                            onClick={() => openStatus(managedUser, "cancel-invitation")}
                          >
                            <XCircle />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        onInvited={() => handleSaved("Convite criado.")}
      />
      <UserEditDialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        roles={roles}
        prefeituras={prefeituras}
        canAssignPrefeituras={canAssignPrefeituras}
        onSaved={() => handleSaved("Usuário atualizado.")}
      />
      <UserStatusDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        user={statusTarget}
        action={statusAction}
        onCompleted={() => handleSaved(
          statusAction === "deactivate"
            ? "Usuário desativado e sessões revogadas."
            : statusAction === "reactivate"
              ? "Usuário reativado."
              : "Convite cancelado.",
        )}
      />
    </Card>
  );
}
