import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/layout/auth-shell";
import {
  PasswordField,
  PasswordMatchFeedback,
  PasswordRequirements,
} from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";
import { PASSWORD_POLICY_ERROR, passwordMeetsPolicy } from "@/lib/password-policy";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [senhaError, setSenhaError] = useState<string | null>(null);
  const [confirmacaoError, setConfirmacaoError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSenhaError(null);
    setConfirmacaoError(null);
    setRequestError(null);

    if (!passwordMeetsPolicy(senha)) {
      setSenhaError(PASSWORD_POLICY_ERROR);
      return;
    }
    if (senha !== confirmacao) {
      setConfirmacaoError("As senhas não coincidem.");
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
      setRequestError(err instanceof ApiError ? err.detail : "Não foi possível redefinir a senha.");
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
            <Field data-invalid={Boolean(senhaError)}>
              <FieldLabel htmlFor="senha">Nova senha</FieldLabel>
              <PasswordField
                id="senha"
                visibilityLabel="nova senha"
                autoComplete="new-password"
                required
                value={senha}
                onChange={(event) => {
                  setSenha(event.target.value);
                  setSenhaError(null);
                }}
                aria-invalid={Boolean(senhaError)}
                aria-describedby={senhaError ? "senha-description senha-error" : "senha-description"}
              />
              <FieldDescription id="senha-description">
                <PasswordRequirements value={senha} />
              </FieldDescription>
              {senhaError ? <FieldError id="senha-error">{senhaError}</FieldError> : null}
            </Field>
            <Field data-invalid={Boolean(confirmacaoError || requestError)}>
              <FieldLabel htmlFor="confirmacao">Confirmar senha</FieldLabel>
              <PasswordField
                id="confirmacao"
                visibilityLabel="confirmação da senha"
                autoComplete="new-password"
                required
                value={confirmacao}
                onChange={(event) => {
                  setConfirmacao(event.target.value);
                  setConfirmacaoError(null);
                }}
                aria-invalid={Boolean(confirmacaoError || requestError)}
                aria-describedby={confirmacaoError || requestError ? "confirmacao-error" : undefined}
              />
              <PasswordMatchFeedback password={senha} confirmation={confirmacao} />
              {confirmacaoError || requestError ? <FieldError id="confirmacao-error">{confirmacaoError ?? requestError}</FieldError> : null}
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
