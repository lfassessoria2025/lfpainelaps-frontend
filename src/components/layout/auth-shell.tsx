import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

// Casca visual compartilhada pelas telas de autenticação (login,
// esqueci-senha, redefinir-senha, accept-invite) — glassmorphism sutil sobre
// os tokens de tema existentes (--card, --border, --primary), funciona em
// light e dark sem cor hardcoded. FLO-34.
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-secondary/20 blur-3xl"
      />
      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-lg border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
