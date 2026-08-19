import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResponsibilityTermUnavailablePage } from "@/pages/responsibility-term-unavailable-page";
import { useAuth } from "@/contexts/auth-context";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/termo-indisponivel"]}>
      <Routes>
        <Route path="/termo-indisponivel" element={<ResponsibilityTermUnavailablePage />} />
        <Route path="/" element={<div>Painel</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResponsibilityTermUnavailablePage", () => {
  it("explica que não é um erro do usuário e oferece saída sem travar na tela", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout,
      refreshUser: vi.fn(),
      setAuthenticatedUser: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/não é um erro do seu usuário/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Voltar ao painel" }));
    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("permite sair da sessão direto da tela de indisponibilidade", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout,
      refreshUser: vi.fn(),
      setAuthenticatedUser: vi.fn(),
    });

    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
