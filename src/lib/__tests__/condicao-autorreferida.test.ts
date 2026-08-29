import { describe, expect, it } from "vitest";
import { apresentarAcaoCondicao, explicarMotivoCondicao } from "@/lib/condicao-autorreferida";

describe("apresentação da condição autorreferida", () => {
  it.each([
    ["inserir", "Inserir em condição de saúde Gestante"],
    ["remover", "Remover condição de saúde Gestante"],
    ["nenhuma_acao", "Nenhuma ação"],
    ["revisar_cadastro", "Revisar cadastro da condição Gestante"],
  ] as const)("traduz a ação %s sem recalcular a decisão", (acao, rotulo) => {
    expect(apresentarAcaoCondicao(acao).rotulo).toBe(rotulo);
  });

  it("explica caso ambíguo sem inferir uma ação", () => {
    expect(explicarMotivoCondicao("estado_esperado_indeterminado")).toMatch(
      /não permitem determinar com segurança/i,
    );
  });
});
