import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/layout/auth-shell";

describe("AuthShell", () => {
  it("renderiza o conteúdo no split-screen com a identidade do produto", () => {
    render(
      <AuthShell>
        <p>Conteúdo da tela de auth</p>
      </AuthShell>,
    );

    const conteudo = screen.getByText("Conteúdo da tela de auth");
    expect(conteudo).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Transforme dados em cuidado mais presente." }))
      .toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Benefícios da plataforma" }))
      .toBeInTheDocument();
    expect(conteudo.closest("div.max-w-sm")).not.toBeNull();
  });
});
