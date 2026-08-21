import { afterEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, reloadOnceForChunkError } from "@/lib/chunk-reload";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("isChunkLoadError", () => {
  it("reconhece as mensagens de falha de import dinâmico dos navegadores suportados", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /assets/x.js"))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
  });

  it("não confunde com um erro de render qualquer", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError("não é nem um Error")).toBe(false);
  });
});

describe("reloadOnceForChunkError", () => {
  it("recarrega na primeira vez e não recarrega de novo na mesma sessão", () => {
    let reloadCalls = 0;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: () => { reloadCalls += 1; } },
    });

    expect(reloadOnceForChunkError()).toBe(true);
    expect(reloadCalls).toBe(1);

    expect(reloadOnceForChunkError()).toBe(false);
    expect(reloadCalls).toBe(1);
  });

  it("não deixa exceção de sessionStorage escapar (ex.: navegação privada restritiva)", () => {
    vi.spyOn(window.sessionStorage.__proto__, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    let reloadCalls = 0;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: () => { reloadCalls += 1; } },
    });

    expect(reloadOnceForChunkError()).toBe(false);
    expect(reloadCalls).toBe(0);
  });
});
