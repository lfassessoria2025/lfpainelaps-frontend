import { useEffect, useState } from "react";
import {
  Accessibility,
  Activity,
  ArrowUpRight,
  BarChart3,
  Baby,
  Blocks,
  Building2,
  CalendarCheck,
  Clock3,
  HeartPulse,
  Link2,
  Loader2,
  ShieldCheck,
  Smile,
  UploadCloud,
  UserCog,
  UsersRound,
  Venus,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { IMPORTACAO_STATUS_INFO } from "@/lib/importacao-status";
import type { ImportacaoOut, Permission, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { temPermissao } from "@/lib/permissions";
import { importacoesService } from "@/services/importacoes";
import { prefeiturasService } from "@/services/prefeituras";

interface DashboardShortcut {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  permission: Permission | Permission[];
  category: "indicador" | "operacao";
}

const SHORTCUTS: DashboardShortcut[] = [
  { to: "/gestantes", title: "Gestantes", description: "Acompanhe pré-natal, consultas e pendências.", icon: Baby, permission: "relatorio.gestante.visualizar", category: "indicador" },
  { to: "/criancas", title: "Crianças", description: "Veja puericultura, vacinas e desenvolvimento.", icon: Blocks, permission: "relatorio.crianca.visualizar", category: "indicador" },
  { to: "/mulheres", title: "Mulheres", description: "Monitore rastreamentos e cuidado integral.", icon: Venus, permission: "relatorio.mulher.visualizar", category: "indicador" },
  { to: "/idosos", title: "Pessoas idosas", description: "Confira acompanhamento, visitas e vacinação.", icon: Accessibility, permission: "relatorio.idoso.visualizar", category: "indicador" },
  { to: "/diabetes", title: "Diabetes", description: "Acompanhe consultas, exames e cuidado completo.", icon: Activity, permission: "relatorio.diabetes.visualizar", category: "indicador" },
  { to: "/hipertensao", title: "Hipertensão", description: "Veja pressão, consultas e acompanhamento.", icon: HeartPulse, permission: "relatorio.hipertensao.visualizar", category: "indicador" },
  { to: "/saude-bucal", title: "Saúde bucal", description: "Monitore produção, prevenção e equipes.", icon: Smile, permission: "relatorio.saude_bucal.visualizar", category: "indicador" },
  { to: "/emulti", title: "eMulti", description: "Consulte ações e atendimentos compartilhados.", icon: UsersRound, permission: "relatorio.emulti.visualizar", category: "indicador" },
  { to: "/mais-acesso", title: "Mais acesso APS", description: "Analise demanda programada e atendimentos.", icon: CalendarCheck, permission: "relatorio.c1.visualizar", category: "indicador" },
  { to: "/vinculo", title: "Vínculo e acompanhamento", description: "Acompanhe cadastro, vínculo e vulnerabilidades.", icon: Link2, permission: "relatorio.vinculo.visualizar", category: "indicador" },
  { to: "/analytics", title: "Analytics", description: "Compare resultados, períodos e equipes.", icon: BarChart3, permission: ["relatorio.visualizar", "relatorio.gestante.visualizar", "relatorio.crianca.visualizar", "relatorio.mulher.visualizar", "relatorio.idoso.visualizar", "relatorio.diabetes.visualizar", "relatorio.hipertensao.visualizar", "relatorio.saude_bucal.visualizar", "relatorio.emulti.visualizar", "relatorio.c1.visualizar", "relatorio.vinculo.visualizar"], category: "operacao" },
  { to: "/importacoes", title: "Importações", description: "Envie backups e acompanhe o processamento.", icon: UploadCloud, permission: "dump.upload", category: "operacao" },
  { to: "/prefeituras", title: "Prefeituras", description: "Gerencie municípios atendidos.", icon: Building2, permission: "prefeitura.gerenciar", category: "operacao" },
  { to: "/usuarios", title: "Usuários e convites", description: "Controle cargos, equipes e acessos.", icon: UserCog, permission: "equipe.gerenciar", category: "operacao" },
  { to: "/cargos", title: "Cargos e permissões", description: "Configure as capacidades de cada cargo.", icon: ShieldCheck, permission: "cargo.visualizar", category: "operacao" },
];

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
  const shortcuts = SHORTCUTS.filter((shortcut) => temPermissao(user, shortcut.permission));
  const indicadores = shortcuts.filter((shortcut) => shortcut.category === "indicador");
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
        actions={temPermissao(user, "relatorio.visualizar") ? (
          <Link to="/analytics" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
            Abrir analytics <ArrowUpRight className="size-4" />
          </Link>
        ) : undefined}
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
            <strong className="text-3xl font-semibold tabular-nums">{indicadores.length}</strong>
            <p className="mt-1 text-xs text-muted-foreground">disponíveis para este usuário</p>
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
            <p className="text-sm text-muted-foreground">Abra diretamente o indicador ou tarefa que você precisa acompanhar.</p>
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
