import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function renderComTema() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("começa no tema claro e troca pra escuro ao clicar", async () => {
    const user = userEvent.setup();
    renderComTema();

    const botao = await screen.findByRole("button", { name: "Mudar para tema escuro" });
    await user.click(botao);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(await screen.findByRole("button", { name: "Mudar para tema claro" })).toBeInTheDocument();
  });

  it("persiste a preferência no localStorage (next-themes)", async () => {
    const user = userEvent.setup();
    renderComTema();

    await user.click(await screen.findByRole("button", { name: "Mudar para tema escuro" }));

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });
});
