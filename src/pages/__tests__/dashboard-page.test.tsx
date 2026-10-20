import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/contexts/auth-context";
import { DashboardPage } from "@/pages/dashboard-page";
import { prefeiturasService } from "@/services/prefeituras";
import { importacoesService } from "@/services/importacoes";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));
vi.mock("@/services/importacoes", () => ({
  importacoesService: { list: vi.fn() },
}));

vi.mocked(prefeiturasService.list).mockResolvedValue([
  { id: 1, ibge_code: "0000000", name: "Jeriquara", active: true },
]);
vi.mocked(importacoesService.list).mockResolvedValue([
  {
    id: "importacao-1",
    status: "concluido",
    display_name: "Backup atual",
    expected_size_bytes: 100,
    created_at: "2026-10-19T12:00:00Z",
    updated_at: "2026-10-19T12:30:00Z",
    last_failure_code: null,
  },
]);

vi.mocked(useAuth).mockReturnValue({
  user: { id: 1, email: "gestor@example.com", name: null, is_admin: true, status: "ativo", permissions: [] },
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  setAuthenticatedUser: vi.fn(),
});

describe("DashboardPage — visão operacional", () => {
  it("escalona a entrada dos atalhos e reforça o hover dos cards", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const atalhos = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.animate-in"));
    expect(atalhos).toHaveLength(5);
    expect(atalhos.slice(0, 3).map((atalho) => atalho.style.animationDelay)).toEqual(["0ms", "55ms", "110ms"]);
    expect(atalhos[0]).toHaveClass("animate-in", "fill-mode-both");
    expect(atalhos[0].firstElementChild).toHaveClass(
      "group-hover:-translate-y-1",
      "group-hover:shadow-lg",
    );
  });

  it("exibe dados operacionais e encaminha os indicadores para a tela própria", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Atualização dos dados")).toBeInTheDocument();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Indicadores" })).toHaveAttribute("href", "/indicadores");
    expect(screen.getByText("5 áreas disponíveis")).toBeInTheDocument();
  });
});
