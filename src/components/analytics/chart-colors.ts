export const CORES_COMPARACAO = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

/** Mantém a associação prefeitura → cor estável em todos os gráficos. */
export function corDaSerie(indice: number): string {
  return CORES_COMPARACAO[indice % CORES_COMPARACAO.length];
}
