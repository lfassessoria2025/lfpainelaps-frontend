import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { RoleFormDialog } from "@/components/roles/role-form-dialog";
import { UsersManagement } from "@/components/roles/users-management";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";
import type { Permission, RoleOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { rolesService } from "@/services/roles";

export function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleOut | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleOut | null>(null);
  const permissions = user?.permissions ?? [];
  const canCreateRole = permissions.includes("cargo.criar");
  const canEditRole = permissions.includes("cargo.editar");
  const canDeleteRole = permissions.includes("cargo.excluir");
  const canManageUsers = permissions.includes("equipe.gerenciar");
  const canAssignPrefeituras = permissions.includes("prefeitura.atribuir");

  async function loadRoles() {
    try {
      const data = await rolesService.list();
      setRoles(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.detail : "Não foi possível carregar os cargos.");
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  function openCreate() {
    setEditingRole(null);
    setFormOpen(true);
  }

  function openEdit(role: RoleOut) {
    setEditingRole(role);
    setFormOpen(true);
  }

  async function handleSubmit(values: { name: string; permissions: Permission[] }) {
    try {
      if (editingRole) {
        await rolesService.update(editingRole.id, values);
        toast.success("Cargo atualizado.");
      } else {
        await rolesService.create(values);
        toast.success("Cargo criado.");
      }
      await loadRoles();
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.detail : "Não foi possível salvar o cargo.");
    }
  }

  async function confirmDelete() {
    if (!roleToDelete) return;
    try {
      await rolesService.remove(roleToDelete.id);
      toast.success("Cargo excluído.");
      setRoleToDelete(null);
      await loadRoles();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Não foi possível excluir o cargo.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cargos e permissões"
        description="Gerencie cargos e o que cada um pode acessar."
        actions={canCreateRole ? (
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Novo cargo
            </Button>
        ) : undefined}
      />

      {roles === null && !loadError ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : roles === null ? null : roles.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>Nenhum cargo cadastrado</EmptyTitle>
            <EmptyDescription>Crie o primeiro cargo para organizar as permissões.</EmptyDescription>
          </EmptyHeader>
          {canCreateRole ? <Button onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Novo cargo
          </Button> : null}
        </Empty>
      ) : (
        <Card className="gap-0 border-border/60 py-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{role.permissions.length} permissões</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEditRole ? <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${role.name}`}
                        onClick={() => openEdit(role)}
                      >
                        <Pencil />
                      </Button> : null}
                      {canDeleteRole ? <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${role.name}`}
                        onClick={() => setRoleToDelete(role)}
                      >
                        <Trash2 />
                      </Button> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {canManageUsers && user ? (
        <UsersManagement
          currentUserId={user.id}
          currentUserIsAdmin={user.is_admin}
          roles={roles ?? []}
          canAssignPrefeituras={canAssignPrefeituras}
        />
      ) : null}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editingRole}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={Boolean(roleToDelete)} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo "{roleToDelete?.name}"? Essa ação não pode
              ser desfeita. Se o cargo estiver em uso, a exclusão será recusada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
