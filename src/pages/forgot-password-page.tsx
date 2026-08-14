import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth";

const MENSAGEM_GENERICA = "Se o e-mail existir, você receberá um link para redefinir a senha.";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await authService.forgotPassword({ email });
    } catch {
      // Mesma tela de sucesso mesmo em erro de rede — nunca revela se o
      // e-mail existe, e o backend já responde com a mensagem genérica em
      // qualquer caso de negócio (existe/não existe/conta inativa).
    } finally {
      setIsSubmitting(false);
      setEnviado(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Esqueci minha senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {enviado ? (
          <p className="text-center text-sm text-foreground">{MENSAGEM_GENERICA}</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                Enviar link
              </Button>
            </FieldGroup>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
