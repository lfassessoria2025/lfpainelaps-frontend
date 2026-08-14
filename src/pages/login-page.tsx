import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/http";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, senha });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Não foi possível entrar. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
          AP
        </div>
        <h1 className="text-lg font-semibold text-foreground">Painel APS</h1>
        <p className="text-sm text-muted-foreground">
          Entre com sua conta para acessar os dados das prefeituras.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Field data-invalid={Boolean(error)}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="senha">Senha</FieldLabel>
              <Link
                to="/esqueci-senha"
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              aria-invalid={Boolean(error)}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Entrar
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
