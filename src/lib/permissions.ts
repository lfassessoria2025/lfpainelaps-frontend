import type { Permission, UserOut } from "@/lib/api-types";

/**
 * Adapta as permissões efetivas recebidas do backend para a navegação.
 * A API continua sendo a autoridade final; isto apenas evita links que
 * inevitavelmente terminariam em 403 e mantém o fluxo mais claro.
 */
export function temPermissao(
  user: UserOut | null | undefined,
  required?: Permission | Permission[],
): boolean {
  if (!required) return true;
  if (user?.is_admin) return true;
  if (!user) return false;
  const permissions = Array.isArray(required) ? required : [required];
  return permissions.some((permission) => user.permissions.includes(permission));
}
