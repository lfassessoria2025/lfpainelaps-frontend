import { useEffect, useState } from "react";
import { Building2, Pencil, Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignMemberDialog } from "@/components/prefeituras/assign-member-dialog";
import { PrefeituraFormDialog } from "@/components/prefeituras/prefeitura-form-dialog";
import { PageHeader } from "@/components/layout/page-header";
import type { PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { prefeiturasService } from "@/services/prefeituras";

export function PrefeiturasPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrefeituraOut | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);

  async function load() {
    try {
      const data = await prefeiturasService.list();
      setPrefeituras(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.detail : "Não foi possível carregar as prefeituras.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(prefeitura: PrefeituraOut) {
    setEditing(prefeitura);
    setFormOpen(true);
  }

  async function handleSubmit(values: { ibge_code?: string; name: string }) {
    try {
      if (editing) {
        await prefeiturasService.update(editing.id, { name: values.name });
        toast.success("Prefeitura atualizada.");
      } else {
        await prefeiturasService.create({
          ibge_code: values.ibge_code ?? "",
          name: values.name,
        });
        toast.success("Prefeitura criada.");
      }
      await load();
    } catch (err) {
      throw new Error(
        err instanceof ApiError ? err.detail : "Não foi possível salvar a prefeitura.",
      );
    }
  }

  async function toggleActive(prefeitura: PrefeituraOut, active: boolean) {
    setPendingToggleId(prefeitura.id);
    try {
      if (active) {
        await prefeiturasService.activate(prefeitura.id);
      } else {
        await prefeiturasService.deactivate(prefeitura.id);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Não foi possível atualizar o status.");
    } finally {
      setPendingToggleId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Prefeituras"
        description="Cadastro e gestão das prefeituras atendidas."
        actions={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(true)}>
              <UserCog data-icon="inline-start" />
              Atribuir usuário
            </Button>
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Nova prefeitura
            </Button>
          </>
        }
      />

      {prefeituras === null && !loadError ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : prefeituras === null ? null : prefeituras.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Nenhuma prefeitura cadastrada</EmptyTitle>
            <EmptyDescription>Cadastre a primeira prefeitura pelo código IBGE.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Nova prefeitura
          </Button>
        </Empty>
      ) : (
        <Card className="gap-0 border-border/60 py-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código IBGE</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prefeituras.map((prefeitura) => (
                <TableRow key={prefeitura.id}>
                  <TableCell className="font-medium">{prefeitura.name}</TableCell>
                  <TableCell className="text-muted-foreground">{prefeitura.ibge_code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={prefeitura.active}
                        disabled={pendingToggleId === prefeitura.id}
                        onCheckedChange={(checked) => toggleActive(prefeitura, checked)}
                        aria-label={`Ativar ou desativar ${prefeitura.name}`}
                      />
                      <Badge variant={prefeitura.active ? "default" : "secondary"}>
                        {prefeitura.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${prefeitura.name}`}
                      onClick={() => openEdit(prefeitura)}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <PrefeituraFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        prefeitura={editing}
        onSubmit={handleSubmit}
      />
      <AssignMemberDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        prefeituras={prefeituras ?? []}
      />
    </div>
  );
}
