export interface ScrollAffordanceState {
  mostrarSombraEsquerda: boolean;
  mostrarSombraDireita: boolean;
}

/**
 * Decide quais sombras de indicação de scroll horizontal mostrar, a partir
 * das medidas de um elemento com overflow — função pura extraída pra ser
 * testável isoladamente (mesmo motivo de analytics-chart-data.ts: layout
 * real de scroll não é confiável de medir em jsdom).
 *
 * `folga` absorve arredondamento de subpixel do navegador (scrollLeft pode
 * chegar a 0.4 mesmo "no início" em telas de alta densidade).
 */
export function calcularAffordanceDeScroll(
  el: { scrollLeft: number; scrollWidth: number; clientWidth: number },
  folga = 1,
): ScrollAffordanceState {
  return {
    mostrarSombraEsquerda: el.scrollLeft > folga,
    mostrarSombraDireita: el.scrollLeft + el.clientWidth < el.scrollWidth - folga,
  };
}
