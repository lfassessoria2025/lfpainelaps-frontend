import { describe, expect, it } from "vitest";
import {
  chaveDaSerie,
  montarFatiasCumprimento,
  montarLinhasDoGrafico,
  montarLinhasEvolucao,
  montarRankingPrefeituras,
} from "@/lib/analytics-chart-data";
import type { MetricasIndicadorOut, SerieHistoricaPontoOut } from "@/lib/api-types";

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

describe("montarRankingPrefeituras", () => {
  it("ordena pelo percentual geral ponderado, do maior para o menor", () => {
    const melhor: MetricasIndicadorOut = {
      ...JERIQUARA,
      prefeitura_id: 2,
      prefeitura_nome: "Pedregulho",
      praticas: [
        { pratica: "A", titulo: "Captação", total_gestantes: 10, total_cumprida: 9, percentual_cumprido: 90 },
        { pratica: "B", titulo: "Consultas", total_gestantes: 2, total_cumprida: 1, percentual_cumprido: 50 },
      ],
    };

    const ranking = montarRankingPrefeituras([JERIQUARA, melhor]);

    expect(ranking.map((item) => item.prefeitura_nome)).toEqual(["Pedregulho", "Jeriquara"]);
    expect(ranking[0].percentual_cumprido).toBe(83.33);
    expect(ranking[1].percentual_cumprido).toBe(75);
  });

  it("trata prefeitura sem ocorrências como zero e preserva a entrada", () => {
    const vazia: MetricasIndicadorOut = {
      prefeitura_id: 3,
      prefeitura_nome: "Sem dados",
      total_gestantes: 0,
      praticas: [],
    };

    expect(montarRankingPrefeituras([vazia])).toEqual([
      { prefeitura_id: 3, prefeitura_nome: "Sem dados", percentual_cumprido: 0 },
    ]);
  });
});

describe("montarLinhasEvolucao", () => {
  it("une datas e cria uma série ponderada por prefeitura", () => {
    const ponto: SerieHistoricaPontoOut = {
      importacao_id: 10,
      data_referencia: "2026-01-15T12:00:00Z",
      total_gestantes: 2,
      praticas: JERIQUARA.praticas,
    };

    const linhas = montarLinhasEvolucao([
      { prefeitura_id: 1, prefeitura_nome: "Jeriquara", pontos: [ponto] },
      {
        prefeitura_id: 2,
        prefeitura_nome: "Pedregulho",
        pontos: [{ ...ponto, importacao_id: 20, praticas: [JERIQUARA.praticas[0]] }],
      },
    ]);

    expect(linhas).toEqual([
      {
        data: "2026-01-15T12:00:00Z",
        data_rotulo: "15/01/2026",
        [chaveDaSerie(1)]: 75,
        [chaveDaSerie(2)]: 50,
      },
    ]);
  });
});
