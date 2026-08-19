import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/lib/http";
import {
  RESPONSIBILITY_TERM_REQUIRED_EVENT,
  RESPONSIBILITY_TERM_UNAVAILABLE_EVENT,
} from "@/lib/responsibility-term-events";

afterEach(() => vi.unstubAllGlobals());

describe("http — HTTP 428", () => {
  it("emite o bloqueio global antes de propagar o erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "Aceite do termo de responsabilidade necessário." }),
      { status: 428, headers: { "content-type": "application/json" } },
    )));
    const listener = vi.fn();
    window.addEventListener(RESPONSIBILITY_TERM_REQUIRED_EVENT, listener, { once: true });

    await expect(http.get("/prefeituras/1/indicadores/gestantes")).rejects.toMatchObject({ status: 428 });
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("http — HTTP 503 (termo indisponível)", () => {
  it("emite o evento de indisponibilidade quando o detail é o de termo indisponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "Termo de responsabilidade indisponível." }),
      { status: 503, headers: { "content-type": "application/json" } },
    )));
    const listener = vi.fn();
    window.addEventListener(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT, listener, { once: true });

    await expect(http.get("/prefeituras/1/indicadores/gestantes")).rejects.toMatchObject({ status: 503 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("não emite o evento para um 503 genérico não relacionado ao termo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "Serviço temporariamente indisponível." }),
      { status: 503, headers: { "content-type": "application/json" } },
    )));
    const listener = vi.fn();
    window.addEventListener(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT, listener, { once: true });

    await expect(http.get("/prefeituras")).rejects.toMatchObject({ status: 503 });
    expect(listener).not.toHaveBeenCalled();
  });
});
