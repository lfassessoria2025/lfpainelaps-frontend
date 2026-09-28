import { useEffect, useMemo, useState } from "react";
import { Building2, Info, UsersRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/permission-labels";
import type {
  Permission,
  PrefeituraOut,
  RoleCreate,
  RoleOut,
  RolePrefeituraScopeIn,
  RoleTeamOut,
} from "@/lib/api-types";
import { prefeiturasService } from "@/services/prefeituras";
import { permissionsService } from "@/services/roles";
import { rolesService } from "@/services/roles";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleOut | null;
  onSubmit: (values: RoleCreate) => Promise<void>;
}

/**
 * Agrupa o catálogo de permissões vindo do backend (`GET /permissions`) usando
 * os grupos/rótulos conhecidos localmente. Qualquer permissão nova no
 * catálogo que ainda não tenha grupo/rótulo cadastrado aqui aparece mesmo
 * assim (grupo "Outras", rótulo bruto) — a lista nunca fica hardcoded a
 * ponto de esconder uma permissão que o backend já concede.
 */
function buildDisplayGroups(catalog: Permission[]) {
  const known = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions));
  const groups = PERMISSION_GROUPS.map((group) => ({
    label: group.label,
    permissions: group.permissions.filter((permission) => catalog.includes(permission)),
  })).filter((group) => group.permissions.length > 0);

  const outras = catalog.filter((permission) => !known.has(permission));
  if (outras.length > 0) {
    groups.push({ label: "Outras", permissions: outras });
  }
  return groups;
}

export function RoleFormDialog({ open, onOpenChange, role, onSubmit }: RoleFormDialogProps) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalog, setCatalog] = useState<Permission[] | null>(null);
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [scopes, setScopes] = useState<RolePrefeituraScopeIn[]>([]);
  const [scopeTouched, setScopeTouched] = useState(true);
  const [teamCatalogs, setTeamCatalogs] = useState<Record<number, RoleTeamOut[]>>({});
  const [loadingTeams, setLoadingTeams] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setPermissions(new Set(role?.permissions ?? []));
      setScopes(
        role?.scopes.map((scope) => ({
          prefeitura_id: scope.prefeitura_id,
          all_teams: scope.all_teams,
          team_keys: [...scope.team_keys],
        })) ?? [],
      );
      setScopeTouched(role ? role.scope_configured : true);
      setTeamCatalogs({});
      setLoadingTeams(new Set());
      setError(null);
      void Promise.allSettled([permissionsService.catalog(), prefeiturasService.list()]).then(
        ([permissionsResult, prefeiturasResult]) => {
          setCatalog(
            permissionsResult.status === "fulfilled"
              ? permissionsResult.value.permissions
              : (Object.keys(PERMISSION_LABELS) as Permission[]),
          );
          setPrefeituras(
            prefeiturasResult.status === "fulfilled" ? prefeiturasResult.value : [],
          );
        },
      );
      const specificScopes = role?.scopes.filter((scope) => !scope.all_teams) ?? [];
      if (specificScopes.length > 0) {
        setLoadingTeams(new Set(specificScopes.map((scope) => scope.prefeitura_id)));
        void Promise.allSettled(
          specificScopes.map(async (scope) => {
            const data = await rolesService.teamCatalog(scope.prefeitura_id);
            return [scope.prefeitura_id, data.teams] as const;
          }),
        ).then((results) => {
          const loaded: Record<number, RoleTeamOut[]> = {};
          for (const result of results) {
            if (result.status === "fulfilled") loaded[result.value[0]] = result.value[1];
          }
          setTeamCatalogs(loaded);
          setLoadingTeams(new Set());
        });
      }
    }
  }, [open, role]);

  const displayGroups = catalog ? buildDisplayGroups(catalog) : [];
  const scopesByPrefeitura = useMemo(
    () => new Map(scopes.map((scope) => [scope.prefeitura_id, scope])),
    [scopes],
  );

  function togglePermission(permission: Permission, checked: boolean) {
    setPermissions((current) => {
      const next = new Set(current);
      if (checked) next.add(permission);
      else next.delete(permission);
      return next;
    });
  }

  function togglePrefeitura(prefeituraId: number, checked: boolean) {
    setScopeTouched(true);
    setScopes((current) => {
      if (!checked) return current.filter((scope) => scope.prefeitura_id !== prefeituraId);
      if (current.some((scope) => scope.prefeitura_id === prefeituraId)) return current;
      return [...current, { prefeitura_id: prefeituraId, all_teams: true, team_keys: [] }];
    });
  }

  async function loadTeams(prefeituraId: number) {
    if (teamCatalogs[prefeituraId] || loadingTeams.has(prefeituraId)) return;
    setLoadingTeams((current) => new Set(current).add(prefeituraId));
    try {
      const data = await rolesService.teamCatalog(prefeituraId);
      setTeamCatalogs((current) => ({ ...current, [prefeituraId]: data.teams }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as equipes.");
    } finally {
      setLoadingTeams((current) => {
        const next = new Set(current);
        next.delete(prefeituraId);
        return next;
      });
    }
  }

  function toggleAllTeams(prefeituraId: number, allTeams: boolean) {
    setScopeTouched(true);
    setScopes((current) =>
      current.map((scope) =>
        scope.prefeitura_id === prefeituraId
          ? { ...scope, all_teams: allTeams, team_keys: allTeams ? [] : scope.team_keys }
          : scope,
      ),
    );
    if (!allTeams) void loadTeams(prefeituraId);
  }

  function toggleTeam(prefeituraId: number, teamKey: string, checked: boolean) {
    setScopeTouched(true);
    setScopes((current) =>
      current.map((scope) => {
        if (scope.prefeitura_id !== prefeituraId) return scope;
        const teamKeys = new Set(scope.team_keys);
        if (checked) teamKeys.add(teamKey);
        else teamKeys.delete(teamKey);
        return { ...scope, team_keys: Array.from(teamKeys) };
      }),
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Informe o nome do cargo.");
      return;
    }
    const invalidScope = scopes.find((scope) => !scope.all_teams && scope.team_keys.length === 0);
    if (scopeTouched && invalidScope) {
      setError("Selecione ao menos uma equipe ou habilite todas as equipes da prefeitura.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        permissions: Array.from(permissions),
        ...(scopeTouched ? { scopes } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cargo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Editar cargo" : "Novo cargo"}</DialogTitle>
          <DialogDescription>
            Defina o que o cargo pode fazer e exatamente onde ele pode atuar.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="role-name">Nome do cargo</FieldLabel>
            <Input
              id="role-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            {catalog === null ? (
              <Spinner className="size-5" />
            ) : (
              displayGroups.map((group) => (
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
                        {PERMISSION_LABELS[permission] ?? permission}
                      </label>
                    ))}
                  </div>
                </FieldSet>
              ))
            )}
          </div>

          <FieldSet>
            <FieldLegend>Onde este cargo pode atuar</FieldLegend>
            <FieldDescription>
              Escolha as prefeituras e, em cada uma, libere todas ou somente equipes específicas.
            </FieldDescription>

            {role && !role.scope_configured && !scopeTouched ? (
              <Alert>
                <Info />
                <AlertTitle>Cargo criado antes do controle por equipe</AlertTitle>
                <AlertDescription>
                  O acesso atual continua definido em cada usuário. Selecione uma prefeitura abaixo
                  para centralizar o acesso neste cargo.
                </AlertDescription>
              </Alert>
            ) : null}

            {prefeituras === null ? (
              <Spinner className="size-5" />
            ) : prefeituras.length === 0 ? (
              <Alert>
                <Info />
                <AlertTitle>Nenhuma prefeitura disponível</AlertTitle>
                <AlertDescription>
                  Este cargo ficará sem acesso a dados até que uma prefeitura seja liberada.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col gap-3">
                {prefeituras.map((prefeitura) => {
                  const scope = scopesByPrefeitura.get(prefeitura.id);
                  const teams = teamCatalogs[prefeitura.id] ?? [];
                  const knownTeamKeys = new Set(teams.map((team) => team.key));
                  const missingKeys = scope?.team_keys.filter((key) => !knownTeamKeys.has(key)) ?? [];
                  return (
                    <div
                      key={prefeitura.id}
                      className="rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox
                          checked={Boolean(scope)}
                          onCheckedChange={(checked) =>
                            togglePrefeitura(prefeitura.id, checked === true)
                          }
                        />
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="font-medium">{prefeitura.name}</span>
                      </label>

                      {scope ? (
                        <div className="mt-3 ml-7 flex flex-col gap-3 border-l pl-4">
                          <label className="flex cursor-pointer items-center justify-between gap-4">
                            <span>
                              <span className="block text-sm font-medium">Todas as equipes</span>
                              <span className="block text-xs text-muted-foreground">
                                Inclui automaticamente novas equipes desta prefeitura.
                              </span>
                            </span>
                            <Switch
                              checked={scope.all_teams}
                              onCheckedChange={(checked) =>
                                toggleAllTeams(prefeitura.id, checked)
                              }
                            />
                          </label>

                          {!scope.all_teams ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <UsersRound className="size-4" />
                                Equipes permitidas
                              </div>
                              {loadingTeams.has(prefeitura.id) ? (
                                <Spinner className="size-5" />
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {teams.map((team) => (
                                    <label
                                      key={team.key}
                                      className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background p-2.5 text-sm"
                                    >
                                      <Checkbox
                                        checked={scope.team_keys.includes(team.key)}
                                        onCheckedChange={(checked) =>
                                          toggleTeam(prefeitura.id, team.key, checked === true)
                                        }
                                      />
                                      <span>
                                        <span className="block font-medium">
                                          {team.name ?? "Equipe sem nome"}
                                        </span>
                                        {team.ine ? (
                                          <span className="block text-xs text-muted-foreground">
                                            INE {team.ine}
                                          </span>
                                        ) : null}
                                      </span>
                                    </label>
                                  ))}
                                  {missingKeys.map((key) => (
                                    <label
                                      key={key}
                                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm"
                                    >
                                      <Checkbox
                                        checked
                                        onCheckedChange={(checked) =>
                                          toggleTeam(prefeitura.id, key, checked === true)
                                        }
                                      />
                                      Equipe anteriormente configurada ({key})
                                    </label>
                                  ))}
                                </div>
                              )}
                              {!loadingTeams.has(prefeitura.id) && teams.length === 0 && missingKeys.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Nenhuma equipe encontrada no último processamento desta prefeitura.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </FieldSet>

          {error ? <FieldError>{error}</FieldError> : null}
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
