import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Sem `globals: true` no vitest.config.ts, o RTL não registra o cleanup
// automático — precisa ser feito explicitamente para não vazar DOM entre testes.
afterEach(() => {
  cleanup();
});
