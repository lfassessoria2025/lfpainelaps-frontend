import { Building2, ShieldCheck, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";

const SHORTCUTS = [
  {
    to: "/cargos",
    title: "Cargos e permissões",
    description: "Defina o que cada cargo pode acessar na plataforma.",
    icon: ShieldCheck,
  },
  {
    to: "/prefeituras",
    title: "Prefeituras",
    description: "Cadastre e gerencie as prefeituras atendidas.",
    icon: Building2,
  },
  {
    to: "/importacoes",
    title: "Importações",
    description: "Envie o backup semanal e acompanhe o processamento.",
    icon: UploadCloud,
  },
] as const;

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.email ?? ""}`}
        description="Escolha uma área para começar."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((shortcut, index) => (
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
