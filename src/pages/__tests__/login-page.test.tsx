import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/login-page";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/http";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("chama login com email e senha preenchidos e navega ao suceder", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ user: null, login, logout: vi.fn(), refreshUser: vi.fn() });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "gestor@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-super-secreta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: "gestor@example.com", senha: "senha-super-secreta" });
    });
    await screen.findByText("Home");
  });

  it("mostra a mensagem de erro do backend quando o login falha", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, "E-mail ou senha inválidos."));
    mockedUseAuth.mockReturnValue({ user: null, login, logout: vi.fn(), refreshUser: vi.fn() });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "gestor@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeInTheDocument();
  });

  it("mostra mensagem genérica quando o erro não é um ApiError (ex.: falha de rede)", async () => {
    const login = vi.fn().mockRejectedValue(new Error("network down"));
    mockedUseAuth.mockReturnValue({ user: null, login, logout: vi.fn(), refreshUser: vi.fn() });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "gestor@example.com");
    await user.type(screen.getByLabelText("Senha"), "qualquer-senha");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("Não foi possível entrar. Verifique sua conexão e tente novamente."),
    ).toBeInTheDocument();
  });
});
