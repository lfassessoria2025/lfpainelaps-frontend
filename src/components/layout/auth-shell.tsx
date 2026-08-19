import type { ReactNode } from "react";
import { Activity, Database, ShieldCheck } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
}

const PILARES = [
  { icon: Database, text: "Dados municipais em um só lugar" },
  { icon: Activity, text: "Indicadores para decisões mais rápidas" },
  { icon: ShieldCheck, text: "Acesso protegido e rastreável" },
] as const;

// Casca visual compartilhada pelas telas de autenticação. O painel editorial
// dá identidade ao produto sem acoplar os formulários a uma página específica;
// cores vêm dos tokens do tema e o movimento respeita a regra global. FLO-44.
export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-48 -top-48 size-[32rem] rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-48 size-[32rem] rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative grid w-full max-w-5xl animate-in overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-2xl backdrop-blur-xl duration-500 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-[42rem] overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="absolute -right-24 -top-24 size-72 rounded-full border border-primary-foreground/20 bg-secondary/30"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-20 size-80 rounded-full border border-primary-foreground/15 bg-accent/20 blur-sm"
          />
          <div
            aria-hidden
            className="absolute right-16 top-36 size-24 rotate-12 rounded-3xl border border-primary-foreground/20 bg-primary-foreground/10"
          />

          <div className="relative flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground font-bold text-primary shadow-lg">
              AP
            </div>
            <div>
              <p className="font-semibold">Painel APS</p>
              <p className="text-xs text-primary-foreground/75">Inteligência para a saúde pública</p>
            </div>
          </div>

          <div className="relative max-w-md">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
              Gestão que enxerga pessoas
            </p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Transforme dados em cuidado mais presente.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-primary-foreground/80">
              Acompanhe indicadores, organize prioridades e fortaleça a atenção básica do seu
              município.
            </p>
          </div>

          <ul className="relative flex flex-col gap-3" aria-label="Benefícios da plataforma">
            {PILARES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-primary-foreground/85">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-[36rem] flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-md">
              AP
            </div>
            <div>
              <p className="font-semibold text-foreground">Painel APS</p>
              <p className="text-xs text-muted-foreground">Inteligência para a saúde pública</p>
            </div>
          </div>
          <div className="w-full max-w-sm self-center">{children}</div>
        </section>
      </div>
    </main>
  );
}
