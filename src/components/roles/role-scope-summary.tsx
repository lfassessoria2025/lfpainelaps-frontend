import { Building2, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RoleOut } from "@/lib/api-types";

interface RoleScopeSummaryProps {
  role: RoleOut;
  compact?: boolean;
}

export function RoleScopeSummary({ role, compact = false }: RoleScopeSummaryProps) {
  if (!role.scope_configured) {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        Acesso definido por usuário
      </Badge>
    );
  }

  if (role.scopes.length === 0) {
    return <Badge variant="secondary">Sem prefeitura</Badge>;
  }

  if (compact) {
    const specificTeams = role.scopes.reduce(
      (total, scope) => total + (scope.all_teams ? 0 : scope.team_keys.length),
      0,
    );
    return (
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">
          <Building2 className="size-3" />
          {role.scopes.length} {role.scopes.length === 1 ? "prefeitura" : "prefeituras"}
        </Badge>
        {specificTeams > 0 ? (
          <Badge variant="outline">
            <UsersRound className="size-3" />
            {specificTeams} {specificTeams === 1 ? "equipe específica" : "equipes específicas"}
          </Badge>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {role.scopes.map((scope) => (
        <div key={scope.prefeitura_id} className="flex items-start gap-2">
          <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <strong className="font-medium">{scope.prefeitura_name}</strong>
            <span className="text-muted-foreground">
              {scope.all_teams
                ? " · todas as equipes"
                : ` · ${scope.team_keys.length} ${scope.team_keys.length === 1 ? "equipe" : "equipes"}`}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
