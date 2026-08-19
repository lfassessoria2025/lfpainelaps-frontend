import { describe, expect, it } from "vitest";
import { calcularAffordanceDeScroll } from "@/lib/scroll-affordance";

describe("calcularAffordanceDeScroll", () => {
  it("no início do scroll, mostra só a sombra direita (há mais conteúdo à frente)", () => {
    const estado = calcularAffordanceDeScroll({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 400 });
    expect(estado).toEqual({ mostrarSombraEsquerda: false, mostrarSombraDireita: true });
  });

  it("no meio do scroll, mostra as duas sombras", () => {
    const estado = calcularAffordanceDeScroll({ scrollLeft: 300, scrollWidth: 1000, clientWidth: 400 });
    expect(estado).toEqual({ mostrarSombraEsquerda: true, mostrarSombraDireita: true });
  });

  it("no fim do scroll, mostra só a sombra esquerda", () => {
    const estado = calcularAffordanceDeScroll({ scrollLeft: 600, scrollWidth: 1000, clientWidth: 400 });
    expect(estado).toEqual({ mostrarSombraEsquerda: true, mostrarSombraDireita: false });
  });

  it("quando não há overflow (conteúdo cabe todo), nenhuma sombra aparece", () => {
    const estado = calcularAffordanceDeScroll({ scrollLeft: 0, scrollWidth: 400, clientWidth: 400 });
    expect(estado).toEqual({ mostrarSombraEsquerda: false, mostrarSombraDireita: false });
  });

  it("absorve arredondamento de subpixel perto das bordas (folga)", () => {
    const inicio = calcularAffordanceDeScroll({ scrollLeft: 0.4, scrollWidth: 1000, clientWidth: 400 });
    expect(inicio.mostrarSombraEsquerda).toBe(false);

    const fim = calcularAffordanceDeScroll({ scrollLeft: 599.7, scrollWidth: 1000, clientWidth: 400 });
    expect(fim.mostrarSombraDireita).toBe(false);
  });
});
