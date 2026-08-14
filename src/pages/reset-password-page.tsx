import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";

const SENHA_MINIMA = 8;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // A resposta já vem com os cookies de sessão setados (mesmo mecanismo
      // do login) — usa o usuário devolvido direto, sem precisar logar de novo.
      const usuario = await authService.resetPassword({ token, senha });
      setAuthenticatedUser(usuario);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível redefinir a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Redefinir senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie uma nova senha de acesso ao Painel APS.
        </p>
      </div>

      {!token ? (
        <p className="text-center text-sm text-destructive">
          Link de redefinição inválido ou incompleto.
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
              Redefinir senha e entrar
            </Button>
          </FieldGroup>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthShell>
  );
}
