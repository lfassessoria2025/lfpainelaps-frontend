import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";

const SENHA_MINIMA = 8;

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (senha.length < SENHA_MINIMA) {
      setError(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.acceptInvite({ token, senha });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível concluir o convite.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Definir senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie sua senha de acesso ao Painel APS.
        </p>
      </div>

      {!token ? (
        <p className="text-center text-sm text-destructive">
          Link de convite inválido ou incompleto.
        </p>
      ) : success ? (
        <p className="text-center text-sm text-foreground">
          Senha definida com sucesso. Redirecionando para o login…
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="senha">Nova senha</FieldLabel>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                required
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              <FieldDescription>Mínimo de {SENHA_MINIMA} caracteres.</FieldDescription>
            </Field>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="confirmacao">Confirmar senha</FieldLabel>
              <Input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                required
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              Definir senha e entrar
            </Button>
          </FieldGroup>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Fazer login
        </Link>
      </p>
    </AuthShell>
  );
}
