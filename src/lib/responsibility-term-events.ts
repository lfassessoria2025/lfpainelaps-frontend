export const RESPONSIBILITY_TERM_REQUIRED_EVENT = "responsibility-term-required";

export function notifyResponsibilityTermRequired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RESPONSIBILITY_TERM_REQUIRED_EVENT));
}

/** Nenhum termo publicado ainda (config pendente) — distinto de "usuário precisa aceitar". */
export const RESPONSIBILITY_TERM_UNAVAILABLE_EVENT = "responsibility-term-unavailable";

export function notifyResponsibilityTermUnavailable() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT));
}
