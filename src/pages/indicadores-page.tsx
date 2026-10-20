import { ArrowUpRight, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";
import { INDICATOR_SHORTCUTS } from "@/lib/navigation";
import { temPermissao } from "@/lib/permissions";

export function IndicadoresPage() {
  const { user } = useAuth();
  const indicators = INDICATOR_SHORTCUTS.filter((item) => temPermissao(user, item.permission));

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Indicadores"
        description="Escolha um indicador para acompanhar resultados, pendências e evolução das equipes."
        actions={<Badge variant="secondary">{indicators.length} disponíveis</Badge>}
      />

      {indicators.length > 0 ? (
        <section aria-label="Indicadores disponíveis" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {indicators.map((indicator, index) => (
            <Link
              key={indicator.to}
              to={indicator.to}
              className="group animate-in fill-mode-both fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <Card className="h-full border-border/60 shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <indicator.icon className="size-5" />
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <CardTitle className="text-base">{indicator.title}</CardTitle>
                  <CardDescription>{indicator.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-5 text-muted-foreground" /> Nenhum indicador disponível</CardTitle>
            <CardDescription>Solicite ao administrador a liberação de um indicador para o seu usuário.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
