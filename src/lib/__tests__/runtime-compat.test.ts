import { afterEach, describe, expect, it } from "vitest";
import { installRuntimeCompat } from "@/lib/runtime-compat";

const arrayPrototype = Array.prototype as Array<unknown> & {
  toSorted?: (compareFn?: (a: unknown, b: unknown) => number) => unknown[];
  flatMap?: <T>(callback: (value: unknown, index: number, array: unknown[]) => T | T[]) => T[];
};
const nativeToSorted = arrayPrototype.toSorted;
const nativeFlatMap = arrayPrototype.flatMap;

afterEach(() => {
  if (nativeToSorted) {
    Object.defineProperty(arrayPrototype, "toSorted", {
      configurable: true,
      writable: true,
      value: nativeToSorted,
    });
  }
  if (nativeFlatMap) {
    Object.defineProperty(arrayPrototype, "flatMap", {
      configurable: true,
      writable: true,
      value: nativeFlatMap,
    });
  }
});

describe("runtime compatibility", () => {
  it("instala toSorted quando o navegador não oferece o método", () => {
    Object.defineProperty(arrayPrototype, "toSorted", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    installRuntimeCompat();
    const original = [3, 1, 2];
    const sorted = original.toSorted((a, b) => Number(a) - Number(b));

    expect(sorted).toEqual([1, 2, 3]);
    expect(original).toEqual([3, 1, 2]);
  });

  it("instala flatMap quando o navegador não oferece o método", () => {
    Object.defineProperty(arrayPrototype, "flatMap", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    installRuntimeCompat();
    expect([1, 2, 3].flatMap((valor) => [valor, Number(valor) * 2])).toEqual([1, 2, 2, 4, 3, 6]);
  });
});
