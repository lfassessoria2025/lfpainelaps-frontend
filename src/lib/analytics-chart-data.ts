import type { MetricasIndicadorOut } from "@/lib/api-types";

// Chave por prefeitura_id (único de fato), nunca por nome — duas prefeituras
// podem ter o mesmo `name` (só `ibge_code` é único no banco), e uma chave
// por nome faria uma sobrescrever a outra silenciosamente no gráfico de
// comparação (achado do CR na Fase C, corrigido aqui). O nome vai só na
// prop `name` do <Bar>, que o recharts já usa como rótulo do
// tooltip/legenda automaticamente — não precisa duplicar lookup no componente.
export function chaveDaSerie(prefeituraId: number): string {
  return `serie_${prefeituraId}`;
}

/**
 * Transformação pura dos dados da API pro formato de linha do recharts —
 * extraída como função testável isoladamente, porque testar via renderização
 * do <BarChart> não é confiável em jsdom (recharts não mede dimensão de SVG
 * sem um layout engine real).
 *
 * O nome completo da prática vem do backend (item.titulo, mesmo campo usado
 * por qualquer indicador futuro) — o eixo mostra o rótulo por extenso em vez
 * de só a letra, pedido explícito da cliente pra reconhecer as práticas do
 * jeito que já vê na planilha dela.
 */
export function montarLinhasDoGrafico(
  dados: MetricasIndicadorOut[],
): Record<string, string | number | null>[] {
  if (dados.length === 0) return [];
  const praticas = dados[0].praticas.map((p) => ({ pratica: p.pratica, titulo: p.titulo }));
  return praticas.map(({ pratica, titulo }) => {
    const linha: Record<string, string | number | null> = {
      pratica,
      rotulo: `${pratica} · ${titulo}`,
    };
    for (const prefeitura of dados) {
      const item = prefeitura.praticas.find((p) => p.pratica === pratica);
      linha[chaveDaSerie(prefeitura.prefeitura_id)] = item?.percentual_cumprido ?? null;
    }
    return linha;
  });
}

export interface CumpridaSlice {
  /** "cumprida" | "nao_cumprida" — chave estável pro <Cell>/paleta, não pro rótulo (esse é `nome`). */
  chave: "cumprida" | "nao_cumprida";
  nome: string;
  valor: number;
}

/**
 * Agregação "cumprida vs. não-cumprida" pro gráfico de pizza — soma
 * total_cumprida e total_gestantes de TODAS as práticas de TODAS as
 * prefeituras recebidas (v1: uma pizza única agregada; em modo comparação
 * as prefeituras selecionadas entram na mesma soma, decisão simples pra não
 * travar a v1 — o componente deixa "agregado" explícito no rótulo pra não
 * passar a impressão de ser uma única prefeitura).
 *
 * Não existe pontuação por gestante no contrato da API (MetricaPraticaOut
 * só tem agregado por prática), então "cumprida" aqui é soma de ocorrências
 * de prática cumprida, não gestante cumprindo tudo.
 *
 * Guarda contra divisão por zero: prefeitura/prática sem gestante
 * (total_gestantes = 0) simplesmente não soma nada, não gera NaN.
 */
export function montarFatiasCumprimento(dados: MetricasIndicadorOut[]): CumpridaSlice[] {
  let totalCumprida = 0;
  let totalOcorrencias = 0;

  for (const prefeitura of dados) {
    for (const pratica of prefeitura.praticas) {
      totalCumprida += pratica.total_cumprida;
      totalOcorrencias += pratica.total_gestantes;
    }
  }

  if (totalOcorrencias === 0) return [];

  const naoCumprida = totalOcorrencias - totalCumprida;

  return [
    { chave: "cumprida", nome: "Cumprida", valor: totalCumprida },
    { chave: "nao_cumprida", nome: "Não cumprida", valor: naoCumprida },
  ];
}

export interface RankingPrefeitura {
  prefeitura_id: number;
  prefeitura_nome: string;
  percentual_cumprido: number;
}

/**
 * Ranking geral ponderado: soma as práticas cumpridas e divide pelo total de
 * ocorrências avaliadas. Não calcula média simples dos percentuais, pois isso
 * daria o mesmo peso a práticas com populações diferentes.
 */
export function montarRankingPrefeituras(
  dados: MetricasIndicadorOut[],
): RankingPrefeitura[] {
  return dados
    .map((prefeitura) => {
      let totalCumprida = 0;
      let totalOcorrencias = 0;
      for (const pratica of prefeitura.praticas) {
        totalCumprida += pratica.total_cumprida;
        totalOcorrencias += pratica.total_gestantes;
      }
      return {
        prefeitura_id: prefeitura.prefeitura_id,
        prefeitura_nome: prefeitura.prefeitura_nome,
        percentual_cumprido:
          totalOcorrencias === 0
            ? 0
            : Math.round((totalCumprida / totalOcorrencias) * 10000) / 100,
      };
    })
    .toSorted(
      (a, b) =>
        b.percentual_cumprido - a.percentual_cumprido ||
        a.prefeitura_nome.localeCompare(b.prefeitura_nome, "pt-BR") ||
        a.prefeitura_id - b.prefeitura_id,
    );
}
