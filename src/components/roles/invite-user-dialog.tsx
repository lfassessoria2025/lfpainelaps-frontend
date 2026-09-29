import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Mail, ShieldCheck, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { UserAccessScopeEditor } from "@/components/roles/user-access-scope-editor";
import type {
  PrefeituraOut,
  RoleOut,
  UserAccessScopeIn,
  UserSummaryOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { usersService } from "@/services/users";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOut[];
  prefeituras: PrefeituraOut[];
  users: UserSummaryOut[];
  canAssignPrefeituras: boolean;
  onInvited?: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  roles,
  prefeituras,
  users,
  canAssignPrefeituras,
  onInvited,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitedToken, setInvitedToken] = useState<string | null>(null);
  const [scopes, setScopes] = useState<UserAccessScopeIn[]>([]);
  const [copyFrom, setCopyFrom] = useState("none");
  const totalTeams = useMemo(
    () => scopes.reduce((total, scope) => total + scope.team_keys.length, 0),
    [scopes],
  );

  useEffect(() => {
    if (open) {
      setEmail("");
      setRoleId("none");
      setError(null);
      setInvitedToken(null);
      setScopes([]);
      setCopyFrom("none");
    }
  }, [open]);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLocaleLowerCase("pt-BR");
    const [local, domain = ""] = normalizedEmail.split("@");
    if (!local || !domain.includes(".")) {
      setError("Informe um e-mail válido, como nome@prefeitura.gov.br.");
      return;
    }
    if (scopes.some((scope) => !scope.all_teams && scope.team_keys.length === 0)) {
      setError("Escolha ao menos uma equipe nas prefeituras selecionadas.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const invitation = await usersService.invite({
        email: normalizedEmail,
        role_id: roleId === "none" ? null : Number(roleId),
        ...(canAssignPrefeituras ? { access_scopes: scopes } : {}),
      });
      setInvitedToken(invitation.token);
      onInvited?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Não foi possível convidar o funcionário.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1.5rem)] max-w-6xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-14">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus />
            </span>
            <span className="flex flex-col gap-1">
              <DialogTitle className="text-lg">Convidar funcionário</DialogTitle>
              <DialogDescription>
                Defina o cargo e exatamente quais dados essa pessoa poderá acessar.
              </DialogDescription>
            </span>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {invitedToken ? (
            <Card className="mx-auto max-w-2xl animate-in fade-in-0 zoom-in-95 duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary" /> Convite criado
                </CardTitle>
                <CardDescription>Compartilhe o link abaixo por um canal seguro.</CardDescription>
              </CardHeader>
              <CardContent>
                <code className="block break-all rounded-lg bg-muted px-3 py-3 text-xs text-muted-foreground">
                  {`${window.location.origin}/accept-invite?token=${invitedToken}`}
                </code>
              </CardContent>
            </Card>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.45fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail /> Dados do convite
                  </CardTitle>
                  <CardDescription>E-mail e função que o funcionário exercerá.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
                      <Input
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-invalid={Boolean(error)}
                        placeholder="nome@prefeitura.gov.br"
                      />
                      {error ? <FieldError>{error}</FieldError> : null}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="invite-role">Cargo</FieldLabel>
                      <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "none")}>
                        <SelectTrigger id="invite-role" className="w-full">
                          <SelectValue placeholder="Sem cargo">
                            {(value: string | null) =>
                              value && value !== "none"
                                ? (roles.find((role) => String(role.id) === value)?.name ?? "Sem cargo")
                                : "Sem cargo"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">Sem cargo</SelectItem>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={String(role.id)}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>Define o que a pessoa pode fazer.</FieldDescription>
                    </Field>
                    {canAssignPrefeituras && users.some((user) => !user.is_admin && user.access_scopes.length > 0) ? (
                      <Field>
                        <FieldLabel htmlFor="invite-copy-access">Copiar lotação</FieldLabel>
                        <Select
                          value={copyFrom}
                          onValueChange={(value) => {
                            const next = value ?? "none";
                            setCopyFrom(next);
                            const source = users.find((user) => String(user.id) === next);
                            if (source) setScopes(source.access_scopes.map((scope) => ({
                              prefeitura_id: scope.prefeitura_id,
                              all_teams: scope.all_teams,
                              team_keys: [...scope.team_keys],
                            })));
                          }}
                        >
                          <SelectTrigger id="invite-copy-access" className="w-full">
                            <SelectValue placeholder="Começar do zero" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">Começar do zero</SelectItem>
                              {users.filter((user) => !user.is_admin && user.access_scopes.length > 0).map((user) => (
                                <SelectItem key={user.id} value={String(user.id)}>{user.name || user.email}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription>Use outro funcionário como modelo.</FieldDescription>
                      </Field>
                    ) : null}
                  </FieldGroup>
                </CardContent>
              </Card>

              {canAssignPrefeituras ? (
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 /> Lotação e acesso
                    </CardTitle>
                    <CardDescription>Escolha a prefeitura e uma ou mais equipes.</CardDescription>
                    <CardAction>
                      <span className="text-xs text-muted-foreground">
                        {scopes.length} prefeitura(s) · {totalTeams} equipe(s)
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <UserAccessScopeEditor
                      prefeituras={prefeituras}
                      scopes={scopes}
                      onChange={setScopes}
                      showHeading={false}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck /> Lotação protegida</CardTitle>
                    <CardDescription>Seu acesso não permite atribuir prefeituras ou equipes.</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl px-6 py-4">
          {invitedToken ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !email}>
                {isSubmitting ? <Spinner data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
                Enviar convite
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
