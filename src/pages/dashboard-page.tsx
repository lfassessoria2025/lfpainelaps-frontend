import { useEffect, useState } from "react";
import { ArrowUpRight, BarChart3, Building2, Clock3, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { IMPORTACAO_STATUS_INFO } from "@/lib/importacao-status";
import type { ImportacaoOut, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { INDICATORS_PAGE_ITEM, OPERATION_SHORTCUTS } from "@/lib/navigation";
import { temPermissao } from "@/lib/permissions";
import { importacoesService } from "@/services/importacoes";
import { prefeiturasService } from "@/services/prefeituras";

interface DashboardOverview {
  prefeituras: PrefeituraOut[];
  latestImport: (ImportacaoOut & { prefeituraName: string }) | null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function latestImportOf(imports: ImportacaoOut[], prefeitura: PrefeituraOut) {
  const latest = [...imports].sort((a, b) => {
    const dateA = new Date(a.updated_at ?? a.created_at).getTime();
    const dateB = new Date(b.updated_at ?? b.created_at).getTime();
    return dateB - dateA;
  })[0];
  return latest ? { ...latest, prefeituraName: prefeitura.name } : null;
}

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "equipe";
  const shortcuts = OPERATION_SHORTCUTS.filter((shortcut) => temPermissao(user, shortcut.permission));
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const canViewImports = temPermissao(user, "dump.upload");

  useEffect(() => {
    const controller = new AbortController();
    async function loadOverview() {
      try {
        const prefeituras = await prefeiturasService.list(controller.signal);
        let latestImport: DashboardOverview["latestImport"] = null;
        const prefeitura = prefeituras.find((item) => item.active) ?? prefeituras[0];
        if (canViewImports && prefeitura) {
          try {
            const imports = await importacoesService.list(prefeitura.id, controller.signal);
            latestImport = latestImportOf(imports, prefeitura);
          } catch {
            // O resumo territorial continua útil mesmo se a consulta opcional de importações falhar.
          }
        }
        if (!controller.signal.aborted) {
          setOverview({ prefeituras, latestImport });
          setOverviewError(null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setOverviewError(err instanceof ApiError ? err.detail : "Não foi possível carregar o resumo.");
      }
    }
    void loadOverview();
    return () => controller.abort();
  }, [canViewImports]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title={`Olá, ${displayName}`}
        description="Uma visão rápida do que está disponível e do que merece atenção agora."
        actions={
          <div className="flex items-center gap-2">
            {temPermissao(user, INDICATORS_PAGE_ITEM.permission) ? (
              <Link to="/indicadores" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                Indicadores <ArrowUpRight className="size-4" />
              </Link>
            ) : null}
            {temPermissao(user, "relatorio.visualizar") ? (
              <Link to="/analytics" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                Abrir analytics <ArrowUpRight className="size-4" />
              </Link>
            ) : null}
          </div>
        }
      />

      <section aria-label="Resumo operacional" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="animate-in fade-in slide-in-from-bottom-2 border-border/60 shadow-sm duration-500">
          <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prefeituras acessíveis</CardTitle>
            <Building2 className="size-5 text-primary" />
          </CardHeader>
          <CardContent>
            {overview ? <strong className="text-3xl font-semibold tabular-nums">{overview.prefeituras.length}</strong> : <Skeleton className="h-9 w-12" />}
            <p className="mt-1 text-xs text-muted-foreground">conforme sua lotação</p>
          </CardContent>
        </Card>
        <Card className="animate-in fade-in slide-in-from-bottom-2 border-border/60 shadow-sm duration-500 [animation-delay:90ms]">
          <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Indicadores liberados</CardTitle>
            <BarChart3 className="size-5 text-primary" />
          </CardHeader>
          <CardContent>
            <strong className="text-3xl font-semibold tabular-nums">{shortcuts.length}</strong>
            <p className="mt-1 text-xs text-muted-foreground">atalhos operacionais disponíveis</p>
          </CardContent>
        </Card>
        <Card className="animate-in fade-in slide-in-from-bottom-2 border-border/60 shadow-sm duration-500 [animation-delay:180ms]">
          <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atualização dos dados</CardTitle>
            <Clock3 className="size-5 text-primary" />
          </CardHeader>
          <CardContent>
            {overview?.latestImport ? (
              <>
                <strong className="block truncate text-lg font-semibold">{IMPORTACAO_STATUS_INFO[overview.latestImport.status].label}</strong>
                <p className="mt-1 truncate text-xs text-muted-foreground" title={overview.latestImport.display_name}>
                  {overview.latestImport.prefeituraName} · {formatDate(overview.latestImport.updated_at ?? overview.latestImport.created_at)}
                </p>
              </>
            ) : overview ? (
              <>
                <strong className="block text-lg font-semibold">Acompanhe seus dados</strong>
                <p className="mt-1 text-xs text-muted-foreground">A última importação aparecerá aqui.</p>
              </>
            ) : <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>
      </section>

      {overviewError ? <p className="text-sm text-muted-foreground" role="status">{overviewError}</p> : null}

      <section aria-labelledby="acesso-rapido-titulo">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="acesso-rapido-titulo" className="text-lg font-semibold tracking-tight">Acesso rápido</h2>
            <p className="text-sm text-muted-foreground">Abra uma área operacional sem sobrecarregar o painel principal.</p>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">{shortcuts.length} áreas disponíveis</Badge>
        </div>
        {shortcuts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shortcuts.map((shortcut, index) => (
              <Link
                key={shortcut.to}
                to={shortcut.to}
                className="group animate-in fill-mode-both fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <Card className="h-full border-border/60 shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
                  <CardHeader className="gap-3">
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                        <shortcut.icon className="size-5" />
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <CardTitle className="text-base">{shortcut.title}</CardTitle>
                    <CardDescription>{shortcut.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card><CardContent className="py-8 text-sm text-muted-foreground">Nenhuma área foi liberada para este usuário.</CardContent></Card>
        )}
      </section>
    </div>
  );
}
