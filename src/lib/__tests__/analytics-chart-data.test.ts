import { describe, expect, it } from "vitest";
import {
  chaveDaSerie,
  montarFatiasCumprimento,
  montarLinhasDoGrafico,
} from "@/lib/analytics-chart-data";
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

describe("montarFatiasCumprimento", () => {
  it("agrega total_cumprida e total_gestantes de todas as práticas de uma prefeitura", () => {
    const fatias = montarFatiasCumprimento([JERIQUARA]);

    // A: 2 gestantes, 1 cumprida · B: 2 gestantes, 2 cumprida => 4 ocorrências, 3 cumpridas, 1 não
    expect(fatias).toEqual([
      { chave: "cumprida", nome: "Cumprida", valor: 3 },
      { chave: "nao_cumprida", nome: "Não cumprida", valor: 1 },
    ]);
  });

  it("soma múltiplas prefeituras (modo comparação) num único agregado", () => {
    const outraPrefeitura: MetricasIndicadorOut = { ...JERIQUARA, prefeitura_id: 2 };

    const fatias = montarFatiasCumprimento([JERIQUARA, outraPrefeitura]);

    expect(fatias).toEqual([
      { chave: "cumprida", nome: "Cumprida", valor: 6 },
      { chave: "nao_cumprida", nome: "Não cumprida", valor: 2 },
    ]);
  });

  it("prefeitura/prática sem gestante não quebra por divisão por zero", () => {
    const semGestante: MetricasIndicadorOut = {
      prefeitura_id: 3,
      prefeitura_nome: "Vazia",
      total_gestantes: 0,
      praticas: [
        { pratica: "A", titulo: "Captação precoce", total_gestantes: 0, total_cumprida: 0, percentual_cumprido: 0 },
      ],
    };

    expect(montarFatiasCumprimento([semGestante])).toEqual([]);
  });

  it("retorna lista vazia sem dados", () => {
    expect(montarFatiasCumprimento([])).toEqual([]);
  });
});
