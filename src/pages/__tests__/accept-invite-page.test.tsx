import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AcceptInvitePage } from "@/pages/accept-invite-page";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";
import type { ResponsibilityTermOut } from "@/lib/api-types";

vi.mock("@/services/auth", () => ({
  authService: { acceptInvite: vi.fn(), invitationTerm: vi.fn() },
}));

const mockedAcceptInvite = vi.mocked(authService.acceptInvite);
const mockedInvitationTerm = vi.mocked(authService.invitationTerm);
const TERM: ResponsibilityTermOut = {
  id: 12,
  version: "1.0",
  title: "Termo de responsabilidade e sigilo",
  content: "Comprometo-me a manter o sigilo dos dados.",
  content_sha256: "a".repeat(64),
  effective_at: "2026-08-15T12:00:00Z",
  accepted: false,
};

function renderAcceptInvitePage(token = "token-valido") {
  return render(
    <MemoryRouter initialEntries={[`/accept-invite?token=${token}`]}>
      <AcceptInvitePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedInvitationTerm.mockResolvedValue(TERM);
});

async function acknowledge(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(TERM.content);
  const checkbox = screen.getByRole("checkbox");
  expect(checkbox).not.toBeChecked();
  await user.click(checkbox);
}

describe("AcceptInvitePage — termo e ativação", () => {
  it("exibe a versão antes da senha e nunca pré-marca a declaração", async () => {
    renderAcceptInvitePage();

    expect(await screen.findByText(TERM.content)).toBeInTheDocument();
    expect(screen.getByText("Versão 1.0")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirmar responsabilidade e ativar conta" })).toBeDisabled();
    expect(mockedAcceptInvite).not.toHaveBeenCalled();
  });

  it("bloqueia senha menor que o mínimo sem chamar o backend", async () => {
    const user = userEvent.setup();
    renderAcceptInvitePage();
    await acknowledge(user);
    await user.type(screen.getByLabelText("Nova senha"), "curta1");
    await user.type(screen.getByLabelText("Confirmar senha"), "curta1");
    await user.click(screen.getByRole("button", { name: "Confirmar responsabilidade e ativar conta" }));

    expect(await screen.findByText("A senha precisa ter pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(mockedAcceptInvite).not.toHaveBeenCalled();
  });

  it("envia id, hash e confirmação verdadeira junto da ativação", async () => {
    mockedAcceptInvite.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAcceptInvitePage();
    await acknowledge(user);
    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-valida-1");
    await user.click(screen.getByRole("button", { name: "Confirmar responsabilidade e ativar conta" }));

    expect(mockedAcceptInvite).toHaveBeenCalledWith({
      token: "token-valido",
      senha: "senha-valida-1",
      term_id: 12,
      term_content_sha256: "a".repeat(64),
      term_acknowledged: true,
    });
    expect(await screen.findByText(/Conta ativada/)).toBeInTheDocument();
  });

  it("recarrega o termo no 409 e exige nova confirmação", async () => {
    const changed = { ...TERM, id: 13, version: "2.0", content: "Nova versão do termo.", content_sha256: "b".repeat(64) };
    mockedInvitationTerm.mockResolvedValueOnce(TERM).mockResolvedValueOnce(changed);
    mockedAcceptInvite.mockRejectedValue(new ApiError(409, "O termo vigente mudou; releia-o."));
    const user = userEvent.setup();
    renderAcceptInvitePage();
    await acknowledge(user);
    await user.type(screen.getByLabelText("Nova senha"), "senha-valida-1");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-valida-1");
    await user.click(screen.getByRole("button", { name: "Confirmar responsabilidade e ativar conta" }));

    expect(await screen.findByText("Nova versão do termo.")).toBeInTheDocument();
    expect(screen.getByText(/termo vigente mudou/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("mostra convite expirado ou revogado sem liberar formulário", async () => {
    mockedInvitationTerm.mockRejectedValue(new ApiError(401, "Sessão inválida."));
    renderAcceptInvitePage("expirado");

    expect(await screen.findByText(/expirou, foi revogado ou já foi utilizado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(mockedAcceptInvite).not.toHaveBeenCalled();
  });

  it("permite tentar novamente após falha de rede", async () => {
    mockedInvitationTerm.mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(TERM);
    const user = userEvent.setup();
    renderAcceptInvitePage();

    await user.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText(TERM.content)).toBeInTheDocument();
    expect(mockedInvitationTerm).toHaveBeenCalledTimes(2);
  });

  it("mostra mensagem de link inválido quando não há token na URL", () => {
    render(
      <MemoryRouter initialEntries={["/accept-invite"]}>
        <AcceptInvitePage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Link de convite inválido ou incompleto.")).toBeInTheDocument();
    expect(mockedInvitationTerm).not.toHaveBeenCalled();
  });
});
