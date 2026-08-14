import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Sem `globals: true` no vitest.config.ts, o RTL não registra o cleanup
// automático — precisa ser feito explicitamente para não vazar DOM entre testes.
afterEach(() => {
  cleanup();
});

// jsdom não implementa matchMedia — next-themes (FLO-32) chama isso sempre
// que enableSystem está ligado, mesmo fora dos testes que mexem em tema.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
