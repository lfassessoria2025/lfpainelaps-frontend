import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

function renderComRota(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("AppSidebar — grupos de navegação (FLO-42)", () => {
  it("agrupa os itens em Indicadores, Administrativo e Dados, com Painel fora de grupo", () => {
    renderComRota("/");

    expect(screen.getByText("Painel")).toBeInTheDocument();
    expect(screen.getByText("Indicadores")).toBeInTheDocument();
    expect(screen.getByText("Gestantes")).toBeInTheDocument();
    expect(screen.getByText("Administrativo")).toBeInTheDocument();
    expect(screen.getByText("Prefeituras")).toBeInTheDocument();
    expect(screen.getByText("Cargos e permissões")).toBeInTheDocument();
    expect(screen.getByText("Dados")).toBeInTheDocument();
    expect(screen.getByText("Importações")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("marca o item ativo correto dentro do seu grupo, sem afetar os outros", () => {
    renderComRota("/gestantes");

    expect(screen.getByRole("link", { name: /Gestantes/ })).toHaveAttribute("data-active");
    expect(screen.getByRole("link", { name: /Painel/ })).not.toHaveAttribute("data-active");
    expect(screen.getByRole("link", { name: "Prefeituras" })).not.toHaveAttribute("data-active");
  });

  it("todas as rotas existentes continuam acessíveis (nenhuma removida no reagrupamento)", () => {
    renderComRota("/");

    const rotasEsperadas = ["/", "/gestantes", "/prefeituras", "/cargos", "/importacoes", "/analytics"];
    for (const rota of rotasEsperadas) {
      const link = screen.getAllByRole("link").find((a) => a.getAttribute("href") === rota);
      expect(link, `rota ${rota} não encontrada`).toBeTruthy();
    }
  });
});
