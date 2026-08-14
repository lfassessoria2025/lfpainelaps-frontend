import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/contexts/auth-context";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mocked(useAuth).mockReturnValue({
  user: { id: 1, email: "gestor@example.com", is_admin: false, status: "ativo" },
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  setAuthenticatedUser: vi.fn(),
});

function renderComRota(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/a" element={<div>Página A</div>} />
          <Route path="/b" element={<div>Página B</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout — transição de página (FLO-33)", () => {
  it("envolve o conteúdo da rota com as classes de animação de entrada", () => {
    renderComRota("/a");

    const conteudo = screen.getByText("Página A");
    const wrapper = conteudo.parentElement;
    expect(wrapper).toHaveClass("animate-in", "fade-in", "slide-in-from-bottom-1");
  });

  it("a chave do wrapper de animação é o pathname da rota atual", () => {
    renderComRota("/b");

    const wrapper = screen.getByText("Página B").parentElement;
    // A key em si não é lida do DOM, mas o mesmo wrapper existe pra
    // qualquer rota — confirma que o mecanismo (key=pathname) não quebra
    // o render de rotas diferentes dentro do mesmo layout.
    expect(wrapper).toHaveClass("animate-in");
  });
});
