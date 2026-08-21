import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteErrorBoundary } from "@/components/layout/route-error-boundary";

function Bomb({ message }: { message: string }): never {
  throw new Error(message);
}

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("RouteErrorBoundary", () => {
  it("mostra um fallback com ação de recarregar para um erro de render qualquer", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <RouteErrorBoundary>
        <Bomb message="Cannot read properties of undefined" />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("Não foi possível carregar esta tela")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeInTheDocument();
  });

  it("recarrega automaticamente, sem mostrar o fallback, quando é falha de chunk dinâmico", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let reloadCalls = 0;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: () => { reloadCalls += 1; } },
    });

    render(
      <RouteErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: /assets/gestantes-page.js" />
      </RouteErrorBoundary>,
    );

    expect(reloadCalls).toBe(1);
    expect(screen.queryByText("Não foi possível carregar esta tela")).not.toBeInTheDocument();
  });

  it("botão Recarregar do fallback aciona um reload da página", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let reloadCalls = 0;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: () => { reloadCalls += 1; } },
    });

    render(
      <RouteErrorBoundary>
        <Bomb message="Cannot read properties of undefined" />
      </RouteErrorBoundary>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Recarregar" }));
    expect(reloadCalls).toBe(1);
  });
});
