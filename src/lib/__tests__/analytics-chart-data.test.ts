import { describe, expect, it } from "vitest";
import { chaveDaSerie, montarLinhasDoGrafico } from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut } from "@/lib/api-types";

const JERIQUARA: MetricasIndicadorOut = {
  prefeitura_id: 1,
  prefeitura_nome: "Jeriquara",
  total_gestantes: 2,
  praticas: [
    { pratica: "A", titulo: "Captação precoce", total_gestantes: 2, total_cumprida: 1, percentual_cumprido: 50 },
    { pratica: "B", titulo: "7+ consultas", total_gestantes: 2, total_cumprida: 2, percentual_cumprido: 100 },
  ],
};

describe("montarLinhasDoGrafico", () => {
  it("monta o rótulo com o nome completo (item.titulo), não só a letra", () => {
    const linhas = montarLinhasDoGrafico([JERIQUARA]);

    expect(linhas).toEqual([
      { pratica: "A", rotulo: "A · Captação precoce", [chaveDaSerie(1)]: 50 },
      { pratica: "B", rotulo: "B · 7+ consultas", [chaveDaSerie(1)]: 100 },
    ]);
  });

  it("nome completo vem do dado da API, não de lista hardcoded — indicador futuro com título diferente já funciona", () => {
    const outroIndicador: MetricasIndicadorOut = {
      ...JERIQUARA,
      praticas: [
        { pratica: "X", titulo: "Alguma prática de outro indicador", total_gestantes: 1, total_cumprida: 1, percentual_cumprido: 100 },
      ],
    };

    const linhas = montarLinhasDoGrafico([outroIndicador]);

    expect(linhas[0].rotulo).toBe("X · Alguma prática de outro indicador");
  });

  it("chaveia por prefeitura_id, nunca por nome — duas prefeituras homônimas não se sobrescrevem", () => {
    const homonimaA: MetricasIndicadorOut = { ...JERIQUARA, prefeitura_id: 10, prefeitura_nome: "Santa Luzia" };
    const homonimaB: MetricasIndicadorOut = { ...JERIQUARA, prefeitura_id: 20, prefeitura_nome: "Santa Luzia" };

    const linhas = montarLinhasDoGrafico([homonimaA, homonimaB]);

    expect(linhas[0][chaveDaSerie(10)]).toBe(50);
    expect(linhas[0][chaveDaSerie(20)]).toBe(50);
    expect(Object.keys(linhas[0])).toContain(chaveDaSerie(10));
    expect(Object.keys(linhas[0])).toContain(chaveDaSerie(20));
  });

  it("prática ausente numa prefeitura vira null (não 0), pra não confundir com '0% real'", () => {
    const semPraticaB: MetricasIndicadorOut = {
      ...JERIQUARA,
      prefeitura_id: 2,
      praticas: [JERIQUARA.praticas[0]],
    };

    const linhas = montarLinhasDoGrafico([JERIQUARA, semPraticaB]);

    const linhaB = linhas.find((l) => l.pratica === "B")!;
    expect(linhaB[chaveDaSerie(2)]).toBeNull();
  });

  it("retorna lista vazia sem dados", () => {
    expect(montarLinhasDoGrafico([])).toEqual([]);
  });
});
