/**
 * Espelho visual da política aplicada pelo backend em `app/domain/user.py`.
 * Serve para feedback imediato; a API continua sendo a autoridade.
 */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordPolicyState {
  hasMinimumLength: boolean;
  hasSpecialCharacter: boolean;
}

export function passwordPolicyState(value: string): PasswordPolicyState {
  return {
    hasMinimumLength: value.trim().length >= PASSWORD_MIN_LENGTH,
    hasSpecialCharacter: [...value].some(
      (character) => !/[\p{L}\p{N}\s]/u.test(character),
    ),
  };
}

export function passwordMeetsPolicy(value: string): boolean {
  const state = passwordPolicyState(value);
  return state.hasMinimumLength && state.hasSpecialCharacter;
}

export const PASSWORD_POLICY_ERROR =
  "A senha deve ter pelo menos 8 caracteres e 1 caractere especial.";
