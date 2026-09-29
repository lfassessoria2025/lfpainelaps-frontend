import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/lib/http";

afterEach(() => vi.restoreAllMocks());

describe("cliente HTTP — erros estruturados do FastAPI", () => {
  it("transforma detail de validação em mensagem renderizável", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      detail: [{
        type: "value_error",
        loc: ["body", "email"],
        msg: "Value error, E-mail inválido.",
        input: "teste",
      }],
    }), {
      status: 422,
      headers: { "content-type": "application/json" },
    }));

    await expect(http.post("/users/invitations", { email: "teste" })).rejects.toEqual(
      expect.objectContaining({ status: 422, detail: "E-mail inválido." }),
    );
  });
});
