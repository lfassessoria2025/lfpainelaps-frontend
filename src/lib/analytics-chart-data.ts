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
