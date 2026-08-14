import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/layout/auth-shell";

describe("AuthShell", () => {
  it("renderiza o conteúdo dentro do card com o visual glassmorphism", () => {
    render(
      <AuthShell>
        <p>Conteúdo da tela de auth</p>
      </AuthShell>,
    );

    const conteudo = screen.getByText("Conteúdo da tela de auth");
    const card = conteudo.closest("div.backdrop-blur-xl");
    expect(card).not.toBeNull();
    expect(card).toHaveClass("bg-card/80", "border-border/60", "animate-in");
  });
});
