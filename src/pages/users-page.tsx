import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { UsersManagement } from "@/components/roles/users-management";
import { PageHeader } from "@/components/layout/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import type { RoleOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { rolesService } from "@/services/roles";

export function UsersPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const permissions = user?.permissions ?? [];
  const canManageUsers = permissions.includes("equipe.gerenciar");
  const canViewRoles = permissions.includes("cargo.visualizar");
  const canAssignPrefeituras = permissions.includes("prefeitura.atribuir");

  useEffect(() => {
    if (!canManageUsers) return;
    if (!canViewRoles) {
      setRoles([]);
      setError(null);
      return;
    }
    void rolesService.list().then(setRoles).catch((err: unknown) => {
      setError(err instanceof ApiError ? err.detail : "Não foi possível carregar os cargos.");
    });
  }, [canManageUsers, canViewRoles]);

  if (!user || !canManageUsers) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>Acesso restrito</EmptyTitle>
          <EmptyDescription>Você não tem permissão para gerenciar usuários e convites.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários e convites"
        description="Atribua cargo, prefeitura e somente as equipes que cada pessoa pode consultar."
      />
      {roles === null && !error ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <UsersManagement
          currentUserId={user.id}
          currentUserIsAdmin={user.is_admin}
          roles={roles ?? []}
          canAssignPrefeituras={canAssignPrefeituras}
        />
      )}
    </div>
  );
}
