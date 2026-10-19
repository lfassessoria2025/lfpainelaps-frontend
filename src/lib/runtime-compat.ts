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
    flatMap?: <T>(callback: (value: unknown, index: number, array: unknown[]) => T | T[]) => T[];
  };

  if (typeof arrayPrototype.toSorted !== "function") {
    Object.defineProperty(arrayPrototype, "toSorted", {
      configurable: true,
      writable: true,
      value(compareFn?: (a: unknown, b: unknown) => number) {
        // `slice` também existe nos navegadores que ainda não têm toSorted;
        // não depender de Array.from torna o fallback útil em versões ainda
        // mais antigas do Safari/Chromium.
        return Array.prototype.slice.call(this).sort(compareFn);
      },
    });
  }

  if (typeof arrayPrototype.flatMap !== "function") {
    Object.defineProperty(arrayPrototype, "flatMap", {
      configurable: true,
      writable: true,
      value<T>(callback: (value: unknown, index: number, array: unknown[]) => T | T[]) {
        const origem = Array.prototype.slice.call(this) as unknown[];
        const resultado: T[] = [];
        origem.forEach((valor, indice) => {
          const item = callback(valor, indice, origem);
          if (Array.isArray(item)) resultado.push(...item);
          else resultado.push(item as T);
        });
        return resultado;
      },
    });
  }
}

installRuntimeCompat();
