import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AcceptInvitePage } from "@/pages/accept-invite-page";
import { authService } from "@/services/auth";

vi.mock("@/services/auth", () => ({
  authService: {
    acceptInvite: vi.fn(),
  },
}));

const mockedAcceptInvite = vi.mocked(authService.acceptInvite);

function renderAcceptInvitePage(token = "token-valido") {
  return render(
    <MemoryRouter initialEntries={[`/accept-invite?token=${token}`]}>
      <AcceptInvitePage />
    </MemoryRouter>,
  );
}

describe("AcceptInvitePage — validação client-side", () => {
  it("bloqueia senha menor que o mínimo sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderAcceptInvitePage();

    await user.type(screen.getByLabelText("Nova senha"), "curta1");
    await user.type(screen.getByLabelText("Confirmar senha"), "curta1");
    await user.click(screen.getByRole("button", { name: "Definir senha e entrar" }));

    expect(await screen.findByText("A senha precisa ter pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(mockedAcceptInvite).not.toHaveBeenCalled();
  });

  it("bloqueia quando confirmação não coincide com a senha, sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderAcceptInvitePage();

    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-diferente-2");
    await user.click(screen.getByRole("button", { name: "Definir senha e entrar" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(mockedAcceptInvite).not.toHaveBeenCalled();
  });

  it("envia ao backend quando a validação client-side passa", async () => {
    mockedAcceptInvite.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAcceptInvitePage("token-valido");

    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-valida-1");
    await user.click(screen.getByRole("button", { name: "Definir senha e entrar" }));

    expect(mockedAcceptInvite).toHaveBeenCalledWith({
      token: "token-valido",
      senha: "senha-valida-1",
    });
    expect(await screen.findByText(/Senha definida com sucesso/)).toBeInTheDocument();
  });

  it("mostra mensagem de link inválido quando não há token na URL", () => {
    render(
      <MemoryRouter initialEntries={["/accept-invite"]}>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Link de convite inválido ou incompleto.")).toBeInTheDocument();
  });
});
