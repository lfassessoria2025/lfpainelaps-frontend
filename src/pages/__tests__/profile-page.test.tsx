import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePage } from "@/pages/profile-page";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";
import type { UserOut } from "@/lib/api-types";

vi.mock("@/services/auth", () => ({
  authService: { updateProfile: vi.fn(), changePassword: vi.fn() },
}));
vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUpdateProfile = vi.mocked(authService.updateProfile);
const mockedChangePassword = vi.mocked(authService.changePassword);
const mockedUseAuth = vi.mocked(useAuth);

const USUARIO: UserOut = {
  id: 1,
  email: "gestor@example.com",
  name: "Nome Antigo",
  is_admin: false,
  status: "ativo",
  permissions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage(setAuthenticatedUser = vi.fn()) {
  mockedUseAuth.mockReturnValue({
    user: USUARIO,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    setAuthenticatedUser,
  });
  return render(<ProfilePage />);
}

describe("ProfilePage — editar nome", () => {
  it("salva o nome e reflete via setAuthenticatedUser", async () => {
    const usuarioAtualizado: UserOut = { ...USUARIO, name: "Nome Novo" };
    mockedUpdateProfile.mockResolvedValue(usuarioAtualizado);
    const setAuthenticatedUser = vi.fn();
    const user = userEvent.setup();
    renderPage(setAuthenticatedUser);

    const campoNome = screen.getByLabelText("Nome");
    await user.clear(campoNome);
    await user.type(campoNome, "Nome Novo");
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));

    expect(mockedUpdateProfile).toHaveBeenCalledWith({ name: "Nome Novo" });
    expect(setAuthenticatedUser).toHaveBeenCalledWith(usuarioAtualizado);
  });

  it("bloqueia nome vazio sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(screen.getByLabelText("Nome"));
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));

    expect(await screen.findByText("Nome não pode ser vazio.")).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("limita o nome ao mesmo máximo aceito pelo backend", () => {
    renderPage();

    expect(screen.getByLabelText("Nome")).toHaveAttribute("maxLength", "150");
  });
});

describe("ProfilePage — trocar senha", () => {
  it("bloqueia senha nova menor que o mínimo sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-valida");
    await user.type(screen.getByLabelText("Nova senha"), "curta1");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "curta1");
    await user.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(
      await screen.findByText("A senha nova precisa ter pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it("bloqueia quando a confirmação não coincide, sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-valida");
    await user.type(screen.getByLabelText("Nova senha"), "senha-nova-valida");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "senha-diferente");
    await user.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it("troca a senha com sucesso e mantém a sessão via setAuthenticatedUser", async () => {
    mockedChangePassword.mockResolvedValue(USUARIO);
    const setAuthenticatedUser = vi.fn();
    const user = userEvent.setup();
    renderPage(setAuthenticatedUser);

    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-valida");
    await user.type(screen.getByLabelText("Nova senha"), "senha-nova-valida");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "senha-nova-valida");
    await user.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(mockedChangePassword).toHaveBeenCalledWith({
      senha_atual: "senha-atual-valida",
      senha_nova: "senha-nova-valida",
    });
    expect(setAuthenticatedUser).toHaveBeenCalledWith(USUARIO);
  });

  it("mostra o erro do backend quando a senha atual está incorreta", async () => {
    mockedChangePassword.mockRejectedValue(new ApiError(401, "Senha atual incorreta."));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Senha atual"), "senha-errada");
    await user.type(screen.getByLabelText("Nova senha"), "senha-nova-valida");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "senha-nova-valida");
    await user.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(await screen.findByText("Senha atual incorreta.")).toBeInTheDocument();
  });
});
