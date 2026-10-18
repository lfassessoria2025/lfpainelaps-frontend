import { Activity, BarChart3, Building2, ShieldCheck, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";
import type { Permission } from "@/lib/api-types";
import { temPermissao } from "@/lib/permissions";

const SHORTCUTS = [
  {
    to: "/cargos",
    title: "Cargos e permissões",
    description: "Defina o que cada cargo pode acessar na plataforma.",
    icon: ShieldCheck,
    permission: "cargo.visualizar",
  },
  {
    to: "/prefeituras",
    title: "Prefeituras",
    description: "Cadastre e gerencie as prefeituras atendidas.",
    icon: Building2,
    permission: "prefeitura.gerenciar",
  },
  {
    to: "/importacoes",
    title: "Importações",
    description: "Envie o backup semanal e acompanhe o processamento.",
    icon: UploadCloud,
    permission: "dump.upload",
  },
  {
    to: "/analytics",
    title: "Analytics",
    description: "Compare indicadores, períodos e equipes em um só lugar.",
    icon: BarChart3,
    permission: ["relatorio.visualizar", "relatorio.gestante.visualizar", "relatorio.crianca.visualizar", "relatorio.mulher.visualizar", "relatorio.idoso.visualizar", "relatorio.diabetes.visualizar", "relatorio.hipertensao.visualizar", "relatorio.saude_bucal.visualizar", "relatorio.emulti.visualizar", "relatorio.c1.visualizar", "relatorio.vinculo.visualizar"],
  },
  {
    to: "/diabetes",
    title: "Diabetes",
    description: "Acompanhe rapidamente o cuidado da pessoa com diabetes.",
    icon: Activity,
    permission: "relatorio.diabetes.visualizar",
  },
] satisfies Array<{ to: string; title: string; description: string; icon: typeof Activity; permission: Permission | Permission[] }>;

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "equipe";
  const shortcuts = SHORTCUTS.filter((shortcut) => temPermissao(user, shortcut.permission));

  return (
    <div>
      <PageHeader
        title={`Olá, ${displayName}`}
        description="Escolha uma área para começar."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((shortcut, index) => (
          <Link
            key={shortcut.to}
            to={shortcut.to}
            className="group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <Card className="h-full border-border/60 shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
              <CardHeader>
                <shortcut.icon className="mb-2 size-6 text-primary" />
                <CardTitle>{shortcut.title}</CardTitle>
                <CardDescription>{shortcut.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
