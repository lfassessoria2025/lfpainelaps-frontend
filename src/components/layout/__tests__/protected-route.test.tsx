import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { useAuth } from "@/contexts/auth-context";
import type { UserOut } from "@/lib/api-types";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Conteúdo protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("redireciona para /login quando não há sessão (user === null)", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText("Tela de login")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("renderiza os filhos quando há sessão (user preenchido)", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", nome: "Ana", email: "ana@example.com" } as unknown as UserOut,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });

  it("mostra spinner de loading enquanto o bootstrap ainda não respondeu (user === undefined)", () => {
    mockedUseAuth.mockReturnValue({
      user: undefined,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });
});
