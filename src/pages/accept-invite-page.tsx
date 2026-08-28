import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResponsibilityTermDocument } from "@/components/responsibility-terms/responsibility-term-document";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth";
import type { ResponsibilityTermOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";

const SENHA_MINIMA = 8;

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [term, setTerm] = useState<ResponsibilityTermOut | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoadingTerm, setIsLoadingTerm] = useState(Boolean(token));
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [acknowledgementError, setAcknowledgementError] = useState<string | null>(null);
  const [senhaError, setSenhaError] = useState<string | null>(null);
  const [confirmacaoError, setConfirmacaoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadTerm = useCallback(async (signal?: AbortSignal, versionChanged = false) => {
    if (!token) return;
    setIsLoadingTerm(true);
    setAcknowledged(false);
    setInviteInvalid(false);
    try {
      const current = await authService.invitationTerm({ token }, signal);
      setTerm(current);
      setError(versionChanged ? "O termo vigente mudou. Leia a nova versão antes de confirmar." : null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setTerm(null);
      if (err instanceof ApiError && err.status === 401) {
        setInviteInvalid(true);
        setError("Este convite expirou, foi revogado ou já foi utilizado. Solicite um novo convite.");
      } else {
        setError(err instanceof ApiError ? err.detail : "Não foi possível carregar o termo. Verifique sua conexão.");
      }
    } finally {
      setIsLoadingTerm(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTerm(controller.signal);
    return () => controller.abort();
  }, [loadTerm]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setAcknowledgementError(null);
    setSenhaError(null);
    setConfirmacaoError(null);
    if (!term || !acknowledged) {
      setAcknowledgementError("Leia o termo e marque a declaração de responsabilidade para continuar.");
      return;
    }
    if (senha.length < SENHA_MINIMA) {
      setSenhaError(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setConfirmacaoError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.acceptInvite({
        token,
        senha,
        term_id: term.id,
        term_content_sha256: term.content_sha256,
        term_acknowledged: true,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await loadTerm(undefined, true);
      } else if (err instanceof ApiError && err.status === 401) {
        setInviteInvalid(true);
        setError("Este convite expirou, foi revogado ou já foi utilizado. Solicite um novo convite.");
      } else {
        setError(err instanceof ApiError ? err.detail : "Não foi possível concluir o convite. Verifique sua conexão.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Ativar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leia o termo de responsabilidade e sigilo e defina sua senha.
        </p>
      </div>

      {!token ? (
        <Alert variant="destructive"><AlertTitle>Convite inválido</AlertTitle><AlertDescription>Link de convite inválido ou incompleto.</AlertDescription></Alert>
      ) : success ? (
        <Alert><AlertTitle>Conta ativada</AlertTitle><AlertDescription>Senha definida e responsabilidade confirmada. Redirecionando para o login…</AlertDescription></Alert>
      ) : isLoadingTerm ? (
        <div className="flex flex-col gap-3" aria-label="Carregando termo do convite">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : inviteInvalid ? (
        <Alert variant="destructive"><AlertTitle>Convite indisponível</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      ) : term ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <ResponsibilityTermDocument term={term} />
          <Field data-invalid={Boolean(acknowledgementError)}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(checked) => {
                  setAcknowledged(checked === true);
                  setAcknowledgementError(null);
                }}
                aria-describedby={acknowledgementError ? "invite-term-acknowledgement invite-term-error" : "invite-term-acknowledgement"}
              />
              <span id="invite-term-acknowledgement">
                Declaro que li e assumo a responsabilidade de manter o sigilo e usar os dados somente para as finalidades autorizadas.
              </span>
            </label>
            <FieldDescription>Esta opção nunca é marcada automaticamente.</FieldDescription>
            {acknowledgementError ? <FieldError id="invite-term-error">{acknowledgementError}</FieldError> : null}
          </Field>
          <FieldGroup>
            <Field data-invalid={Boolean(senhaError)}>
              <FieldLabel htmlFor="senha">Nova senha</FieldLabel>
              <Input
                id="senha"
                type="password"
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
              <FieldDescription id="senha-description">Mínimo de {SENHA_MINIMA} caracteres.</FieldDescription>
              {senhaError ? <FieldError id="senha-error">{senhaError}</FieldError> : null}
            </Field>
            <Field data-invalid={Boolean(confirmacaoError)}>
              <FieldLabel htmlFor="confirmacao">Confirmar senha</FieldLabel>
              <Input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                required
                value={confirmacao}
                onChange={(event) => {
                  setConfirmacao(event.target.value);
                  setConfirmacaoError(null);
                }}
                aria-invalid={Boolean(confirmacaoError)}
                aria-describedby={confirmacaoError ? "confirmacao-error" : undefined}
              />
              {confirmacaoError ? <FieldError id="confirmacao-error">{confirmacaoError}</FieldError> : null}
            </Field>
            <Button type="submit" disabled={isSubmitting || !acknowledged} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              Confirmar responsabilidade e ativar conta
            </Button>
          </FieldGroup>
        </form>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Termo indisponível</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" onClick={() => void loadTerm()}>Tentar novamente</Button>
        </Alert>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">Fazer login</Link>
      </p>
    </AuthShell>
  );
}
