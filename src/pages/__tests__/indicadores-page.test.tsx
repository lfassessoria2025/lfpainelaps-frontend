import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/contexts/auth-context";
import { IndicadoresPage } from "@/pages/indicadores-page";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mocked(useAuth).mockReturnValue({
  user: { id: 1, email: "admin@example.com", name: "Admin", is_admin: true, status: "ativo", permissions: [] },
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  setAuthenticatedUser: vi.fn(),
});

describe("IndicadoresPage", () => {
  it("exibe todos os indicadores em uma tela própria", () => {
    render(
      <MemoryRouter>
        <IndicadoresPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Indicadores" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Diabetes/ })).toHaveAttribute("href", "/diabetes");
    expect(screen.getByText("10 disponíveis")).toBeInTheDocument();
  });
});
