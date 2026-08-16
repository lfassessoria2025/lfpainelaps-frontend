export const RESPONSIBILITY_TERM_REQUIRED_EVENT = "responsibility-term-required";

export function notifyResponsibilityTermRequired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RESPONSIBILITY_TERM_REQUIRED_EVENT));
}
