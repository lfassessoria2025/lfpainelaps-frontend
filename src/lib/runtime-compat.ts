/**
 * Compatibilidade para navegadores que ainda não implementam os métodos
 * imutáveis de Array usados pelo frontend. Sem este fallback, a abertura de
 * qualquer indicador que chama `toSorted()` falha durante o render e cai no
 * RouteErrorBoundary.
 *
 * O polyfill preserva a semântica nativa: cria uma cópia e ordena a cópia,
 * sem modificar o array original.
 */
export function installRuntimeCompat(): void {
  const arrayPrototype = Array.prototype as Array<unknown> & {
    toSorted?: (compareFn?: (a: unknown, b: unknown) => number) => unknown[];
  };

  if (typeof arrayPrototype.toSorted === "function") return;

  Object.defineProperty(arrayPrototype, "toSorted", {
    configurable: true,
    writable: true,
    value(compareFn?: (a: unknown, b: unknown) => number) {
      return Array.from(this).sort(compareFn);
    },
  });
}

installRuntimeCompat();
