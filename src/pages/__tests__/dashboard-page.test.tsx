import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/contexts/auth-context";
import { DashboardPage } from "@/pages/dashboard-page";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mocked(useAuth).mockReturnValue({
  user: { id: 1, email: "gestor@example.com", name: null, is_admin: true, status: "ativo", permissions: [] },
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  setAuthenticatedUser: vi.fn(),
});

describe("DashboardPage — microinterações (FLO-45)", () => {
  it("escalona a entrada dos atalhos e reforça o hover dos cards", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const atalhos = screen.getAllByRole("link");
    expect(atalhos).toHaveLength(3);
    expect(atalhos.map((atalho) => atalho.style.animationDelay)).toEqual(["0ms", "90ms", "180ms"]);
    expect(atalhos[0]).toHaveClass("animate-in", "fill-mode-both");
    expect(atalhos[0].firstElementChild).toHaveClass(
      "group-hover:-translate-y-1",
      "group-hover:shadow-lg",
    );
  });
});
