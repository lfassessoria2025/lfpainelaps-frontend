import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderTopbar() {
  mockedUseAuth.mockReturnValue({
    user: { id: 1, email: "gestor@example.com", name: "Gestora", is_admin: false, status: "ativo", permissions: [] },
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    setAuthenticatedUser: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <SidebarProvider>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <AppTopbar />
                <div>Painel</div>
              </>
            }
          />
          <Route path="/perfil" element={<div>Página de perfil</div>} />
        </Routes>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("AppTopbar — item de editar perfil (FLO-43)", () => {
  it("exibe imediatamente o nome presente no usuário autenticado", () => {
    renderTopbar();

    expect(screen.getByRole("button", { name: /Gestora/ })).toBeInTheDocument();
  });

  it("navega para /perfil ao clicar em 'Editar perfil' no menu", async () => {
    const user = userEvent.setup();
    renderTopbar();

    await user.click(screen.getByRole("button", { name: /Gestora/ }));
    await user.click(await screen.findByText("Editar perfil"));

    expect(await screen.findByText("Página de perfil")).toBeInTheDocument();
  });
});
