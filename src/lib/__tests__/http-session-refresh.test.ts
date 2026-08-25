import { afterEach, describe, expect, it, vi } from "vitest";
import { http, ApiError } from "@/lib/http";

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("http — renovação silenciosa de sessão (401)", () => {
  it("renova via /auth/refresh e repete a requisição original, sem propagar o 401", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(jsonResponse(200, { id: 1 }));
      }
      if (url.endsWith("/prefeituras")) {
        // Primeira chamada expira; a repetição (pós-renovação) sucede.
        if (fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/prefeituras")).length === 1) {
          return Promise.resolve(jsonResponse(401, { detail: "Sessão expirada." }));
        }
        return Promise.resolve(jsonResponse(200, []));
      }
      throw new Error(`chamada inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(http.get("/prefeituras")).resolves.toEqual([]);

    const chamadas = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(chamadas).toEqual([
      expect.stringContaining("/prefeituras"),
      expect.stringContaining("/auth/refresh"),
      expect.stringContaining("/prefeituras"),
    ]);
  });

  it("propaga o 401 original quando a renovação também falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/auth/refresh")) {
          return Promise.resolve(jsonResponse(401, { detail: "Sessão expirada." }));
        }
        return Promise.resolve(jsonResponse(401, { detail: "Sessão expirada." }));
      }),
    );

    await expect(http.get("/prefeituras")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<ApiError>);
  });

  it("não tenta renovar em cima de /auth/login (401 ali é credencial errada)", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse(401, { detail: "E-mail ou senha inválidos." })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(http.post("/auth/login", { email: "a@a.com", senha: "x" })).rejects.toMatchObject(
      { status: 401 },
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("deduplica renovações concorrentes: duas 401 simultâneas chamam /auth/refresh uma única vez", async () => {
    let chamadasRefresh = 0;
    let chamadasPrefeituras = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        chamadasRefresh += 1;
        return Promise.resolve(jsonResponse(200, { id: 1 }));
      }
      chamadasPrefeituras += 1;
      // As duas primeiras chamadas são as tentativas iniciais (concorrentes,
      // ambas expiradas); da terceira em diante já são a repetição pós-renovação.
      return chamadasPrefeituras <= 2
        ? Promise.resolve(jsonResponse(401, { detail: "Sessão expirada." }))
        : Promise.resolve(jsonResponse(200, []));
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([http.get("/prefeituras"), http.get("/prefeituras")]);

    expect(chamadasRefresh).toBe(1);
  });
});
