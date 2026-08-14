import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";

const SENHA_MINIMA = 8;
const NOME_MAXIMO = 150;

export function ProfilePage() {
  const { user, setAuthenticatedUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [senhaError, setSenhaError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  async function handleSalvarNome(event: FormEvent) {
    event.preventDefault();
    setNameError(null);

    if (!name.trim()) {
      setNameError("Nome não pode ser vazio.");
      return;
    }
    if (name.trim().length > NOME_MAXIMO) {
      setNameError(`Nome deve ter no máximo ${NOME_MAXIMO} caracteres.`);
      return;
    }

    setIsSavingName(true);
    try {
      const usuarioAtualizado = await authService.updateProfile({ name: name.trim() });
      setAuthenticatedUser(usuarioAtualizado);
      toast.success("Nome atualizado.");
    } catch (err) {
      setNameError(err instanceof ApiError ? err.detail : "Não foi possível salvar o nome.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleTrocarSenha(event: FormEvent) {
    event.preventDefault();
    setSenhaError(null);

    if (senhaNova.length < SENHA_MINIMA) {
      setSenhaError(`A senha nova precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senhaNova !== confirmacao) {
      setSenhaError("As senhas não coincidem.");
      return;
    }

    setIsChangingPassword(true);
    try {
      // A resposta já vem com os cookies de sessão novos (mesmo mecanismo do
      // login/redefinição) — as sessões antigas foram invalidadas no backend,
      // mas esta continua autenticada, sem precisar logar de novo.
      const usuarioAtualizado = await authService.changePassword({
        senha_atual: senhaAtual,
        senha_nova: senhaNova,
      });
      setAuthenticatedUser(usuarioAtualizado);
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmacao("");
      toast.success("Senha alterada.");
    } catch (err) {
      setSenhaError(err instanceof ApiError ? err.detail : "Não foi possível trocar a senha.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader title="Editar perfil" description="Atualize seu nome e sua senha de acesso." />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nome</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarNome} noValidate>
              <FieldGroup>
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="name">Nome</FieldLabel>
                  <Input
                    id="name"
                    autoComplete="name"
                    required
                    maxLength={NOME_MAXIMO}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={Boolean(nameError)}
                  />
                  {nameError ? <FieldError>{nameError}</FieldError> : null}
                </Field>
                <Button type="submit" disabled={isSavingName} className="w-fit">
                  {isSavingName ? <Spinner data-icon="inline-start" /> : null}
                  Salvar nome
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trocar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrocarSenha} noValidate>
              <FieldGroup>
                <Field data-invalid={Boolean(senhaError)}>
                  <FieldLabel htmlFor="senha-atual">Senha atual</FieldLabel>
                  <Input
                    id="senha-atual"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={senhaAtual}
                    onChange={(event) => setSenhaAtual(event.target.value)}
                    aria-invalid={Boolean(senhaError)}
                  />
                </Field>
                <Field data-invalid={Boolean(senhaError)}>
                  <FieldLabel htmlFor="senha-nova">Nova senha</FieldLabel>
                  <Input
                    id="senha-nova"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={senhaNova}
                    onChange={(event) => setSenhaNova(event.target.value)}
                    aria-invalid={Boolean(senhaError)}
                  />
                  <FieldDescription>Mínimo de {SENHA_MINIMA} caracteres.</FieldDescription>
                </Field>
                <Field data-invalid={Boolean(senhaError)}>
                  <FieldLabel htmlFor="confirmacao">Confirmar nova senha</FieldLabel>
                  <Input
                    id="confirmacao"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                    aria-invalid={Boolean(senhaError)}
                  />
                  {senhaError ? <FieldError>{senhaError}</FieldError> : null}
                </Field>
                <Button type="submit" disabled={isChangingPassword} className="w-fit">
                  {isChangingPassword ? <Spinner data-icon="inline-start" /> : null}
                  Trocar senha
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
