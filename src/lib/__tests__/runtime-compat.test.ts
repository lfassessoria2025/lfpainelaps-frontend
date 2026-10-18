import { afterEach, describe, expect, it } from "vitest";
import { installRuntimeCompat } from "@/lib/runtime-compat";

const arrayPrototype = Array.prototype as Array<unknown> & {
  toSorted?: (compareFn?: (a: unknown, b: unknown) => number) => unknown[];
};
const nativeToSorted = arrayPrototype.toSorted;

afterEach(() => {
  if (nativeToSorted) {
    Object.defineProperty(arrayPrototype, "toSorted", {
      configurable: true,
      writable: true,
      value: nativeToSorted,
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
});
