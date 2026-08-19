import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/lib/http";
import { RESPONSIBILITY_TERM_REQUIRED_EVENT } from "@/lib/responsibility-term-events";

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
