import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type {
  PrefeituraOut,
  UserAccessScopeIn,
  UserTeamOut,
} from "@/lib/api-types";
import { usersService } from "@/services/users";
import { cn } from "@/lib/utils";

interface UserAccessScopeEditorProps {
  prefeituras: PrefeituraOut[];
  scopes: UserAccessScopeIn[];
  onChange: (scopes: UserAccessScopeIn[]) => void;
  disabled?: boolean;
  showHeading?: boolean;
}

export function UserAccessScopeEditor({
  prefeituras,
  scopes,
  onChange,
  disabled = false,
  showHeading = true,
}: UserAccessScopeEditorProps) {
  const [catalogs, setCatalogs] = useState<Record<number, UserTeamOut[]>>({});
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const [searches, setSearches] = useState<Record<number, string>>({});
  const byPrefeitura = useMemo(
    () => new Map(scopes.map((scope) => [scope.prefeitura_id, scope])),
    [scopes],
  );

  const loadTeams = useCallback(async (prefeituraId: number) => {
    if (catalogs[prefeituraId] || loading.has(prefeituraId)) return;
    setLoading((current) => new Set(current).add(prefeituraId));
    try {
      const result = await usersService.teamCatalog(prefeituraId);
      setCatalogs((current) => ({ ...current, [prefeituraId]: result.teams }));
    } finally {
      setLoading((current) => {
        const next = new Set(current);
        next.delete(prefeituraId);
        return next;
      });
    }
  }, [catalogs, loading]);

  useEffect(() => {
    for (const scope of scopes) {
      if (!scope.all_teams && !catalogs[scope.prefeitura_id] && !loading.has(scope.prefeitura_id)) {
        void loadTeams(scope.prefeitura_id);
      }
    }
  }, [catalogs, loadTeams, loading, scopes]);

  function togglePrefeitura(prefeituraId: number, checked: boolean) {
    if (!checked) {
      onChange(scopes.filter((scope) => scope.prefeitura_id !== prefeituraId));
      return;
    }
    if (byPrefeitura.has(prefeituraId)) return;
    onChange([...scopes, { prefeitura_id: prefeituraId, all_teams: false, team_keys: [] }]);
    void loadTeams(prefeituraId);
  }

  function updateScope(prefeituraId: number, update: Partial<UserAccessScopeIn>) {
    onChange(scopes.map((scope) => (
      scope.prefeitura_id === prefeituraId ? { ...scope, ...update } : scope
    )));
  }

  function toggleTeam(prefeituraId: number, teamKey: string, checked: boolean) {
    const scope = byPrefeitura.get(prefeituraId);
    if (!scope) return;
    const teamKeys = new Set(scope.team_keys);
    if (checked) teamKeys.add(teamKey);
    else teamKeys.delete(teamKey);
    updateScope(prefeituraId, { team_keys: Array.from(teamKeys).toSorted() });
  }

  return (
    <FieldSet disabled={disabled}>
      <FieldLegend className={showHeading ? undefined : "sr-only"}>Lotação e acesso aos dados</FieldLegend>
      {showHeading ? (
        <FieldDescription>
          Selecione a prefeitura e as equipes deste funcionário. O cargo não precisa ser duplicado por equipe.
        </FieldDescription>
      ) : null}
      <div className="flex flex-col gap-2.5">
        {prefeituras.map((prefeitura) => {
          const scope = byPrefeitura.get(prefeitura.id);
          const teams = catalogs[prefeitura.id] ?? [];
          const term = (searches[prefeitura.id] ?? "").trim().toLocaleLowerCase("pt-BR");
          const filtered = term
            ? teams.filter((team) => `${team.name ?? ""} ${team.ine ?? ""}`.toLocaleLowerCase("pt-BR").includes(term))
            : teams;
          const known = new Set(teams.map((team) => team.key));
          const missing = scope?.team_keys.filter((key) => !known.has(key)) ?? [];
          return (
            <div
              key={prefeitura.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-background transition-all duration-200",
                scope ? "shadow-sm ring-1 ring-primary/15" : "hover:bg-muted/30",
              )}
            >
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
                <Checkbox
                  checked={Boolean(scope)}
                  onCheckedChange={(checked) => togglePrefeitura(prefeitura.id, checked === true)}
                />
                <span className={cn(
                  "flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                  scope && "bg-primary/10 text-primary",
                )}>
                  <Building2 />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{prefeitura.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {scope ? "Prefeitura incluída no acesso" : "Clique para incluir"}
                  </span>
                </span>
                {scope ? (
                  <Badge variant="secondary">
                    {scope.all_teams ? "Todas" : `${scope.team_keys.length} selecionada(s)`}
                  </Badge>
                ) : null}
              </label>
              {scope ? (
                <div className="animate-in fade-in-0 slide-in-from-top-2 flex flex-col gap-3 border-t bg-muted/20 p-3.5 duration-200">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-background px-3 py-2.5 ring-1 ring-foreground/10">
                    <span className="flex items-center gap-2.5">
                      <CheckCircle2 className="text-muted-foreground" />
                      <span>
                        <span className="block text-sm font-medium">Todas as equipes atuais e futuras</span>
                        <span className="block text-xs text-muted-foreground">Recomendado para coordenação municipal.</span>
                      </span>
                    </span>
                    <Switch
                      checked={scope.all_teams}
                      onCheckedChange={(checked) => updateScope(prefeitura.id, {
                        all_teams: checked,
                        team_keys: checked ? [] : scope.team_keys,
                      })}
                    />
                  </label>
                  {!scope.all_teams ? (
                    <div className="animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-2.5 duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <UsersRound /> Equipes específicas
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {scope.team_keys.length} selecionada(s)
                        </span>
                      </div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          value={searches[prefeitura.id] ?? ""}
                          onChange={(event) => setSearches((current) => ({
                            ...current,
                            [prefeitura.id]: event.target.value,
                          }))}
                          placeholder="Buscar por nome ou INE"
                          aria-label={`Buscar equipes de ${prefeitura.name}`}
                        />
                      </div>
                      {loading.has(prefeitura.id) ? <Spinner /> : (
                        <>
                          {filtered.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">{filtered.length} equipe(s) exibida(s)</span>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateScope(prefeitura.id, {
                                    team_keys: Array.from(new Set([
                                      ...scope.team_keys,
                                      ...filtered.map((team) => team.key),
                                    ])).toSorted(),
                                  })}
                                >Selecionar exibidas</Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateScope(prefeitura.id, { team_keys: [] })}
                                >Limpar</Button>
                              </div>
                            </div>
                          ) : null}
                          <div className="grid max-h-64 gap-1 overflow-y-auto rounded-lg bg-background p-1 ring-1 ring-foreground/10 sm:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((team) => (
                              <label
                                key={team.key}
                                className={cn(
                                  "flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted",
                                  scope.team_keys.includes(team.key) && "bg-primary/5",
                                )}
                              >
                                <Checkbox
                                  checked={scope.team_keys.includes(team.key)}
                                  onCheckedChange={(checked) => toggleTeam(prefeitura.id, team.key, checked === true)}
                                />
                                <span>
                                  <span className="block font-medium">{team.name ?? "Equipe sem nome"}</span>
                                  {team.ine ? <span className="text-xs text-muted-foreground">INE {team.ine}</span> : null}
                                </span>
                              </label>
                            ))}
                            {missing.map((key) => (
                              <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-2.5 py-2 text-sm">
                                <Checkbox checked onCheckedChange={(checked) => toggleTeam(prefeitura.id, key, checked === true)} />
                                Equipe preservada ({key})
                              </label>
                            ))}
                          </div>
                          {filtered.length === 0 && missing.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma equipe encontrada.</p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {prefeituras.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma prefeitura está disponível para atribuição.
          </p>
        ) : null}
      </div>
    </FieldSet>
  );
}
