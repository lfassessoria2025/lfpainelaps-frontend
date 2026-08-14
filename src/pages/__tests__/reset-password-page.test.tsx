import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";
import type { UserOut } from "@/lib/api-types";

vi.mock("@/services/auth", () => ({
  authService: { resetPassword: vi.fn() },
}));
vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedResetPassword = vi.mocked(authService.resetPassword);
const mockedUseAuth = vi.mocked(useAuth);

const USUARIO: UserOut = { id: 1, email: "gestor@example.com", is_admin: false, status: "ativo" };

function renderPage(token = "token-valido", setAuthenticatedUser = vi.fn()) {
  mockedUseAuth.mockReturnValue({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    setAuthenticatedUser,
  });
  return render(
    <MemoryRouter initialEntries={[`/redefinir-senha?token=${token}`]}>
      <Routes>
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/" element={<div>Painel</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage — validação client-side", () => {
  it("bloqueia senha menor que o mínimo sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Nova senha"), "curta1");
    await user.type(screen.getByLabelText("Confirmar senha"), "curta1");
    await user.click(screen.getByRole("button", { name: "Redefinir senha e entrar" }));

    expect(
      await screen.findByText("A senha precisa ter pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it("bloqueia quando confirmação não coincide, sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-diferente-2");
    await user.click(screen.getByRole("button", { name: "Redefinir senha e entrar" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it("mostra mensagem de link inválido quando não há token na URL", () => {
    renderPage("");

    expect(screen.getByText("Link de redefinição inválido ou incompleto.")).toBeInTheDocument();
  });
});

describe("ResetPasswordPage — sucesso já autentica", () => {
  it("envia ao backend, autentica com o usuário retornado e navega pro painel", async () => {
    mockedResetPassword.mockResolvedValue(USUARIO);
    const setAuthenticatedUser = vi.fn();
    const user = userEvent.setup();
    renderPage("token-valido", setAuthenticatedUser);

    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-valida-1");
    await user.click(screen.getByRole("button", { name: "Redefinir senha e entrar" }));

    expect(mockedResetPassword).toHaveBeenCalledWith({
      token: "token-valido",
      senha: "senha-valida-1",
    });
    // Não precisa de um segundo login — o usuário da resposta já autentica.
    expect(setAuthenticatedUser).toHaveBeenCalledWith(USUARIO);
    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("mostra o erro do backend e não autentica quando o token é inválido", async () => {
    mockedResetPassword.mockRejectedValue(new ApiError(401, "Sessão inválida ou expirada."));
    const setAuthenticatedUser = vi.fn();
    const user = userEvent.setup();
    renderPage("token-invalido", setAuthenticatedUser);

    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-valida-1");
    await user.click(screen.getByRole("button", { name: "Redefinir senha e entrar" }));

    expect(await screen.findByText("Sessão inválida ou expirada.")).toBeInTheDocument();
    expect(setAuthenticatedUser).not.toHaveBeenCalled();
  });
});
