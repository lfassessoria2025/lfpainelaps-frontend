import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersManagement } from "@/components/roles/users-management";
import type { RoleOut, UserSummaryOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { prefeiturasService } from "@/services/prefeituras";
import { usersService } from "@/services/users";

vi.mock("@/services/users", () => ({
  usersService: {
    list: vi.fn(),
    invite: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    cancelInvitation: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));

const mockedUsers = vi.mocked(usersService);
const mockedPrefeituras = vi.mocked(prefeiturasService);
const ROLES: RoleOut[] = [{ id: 7, name: "Enfermeira", permissions: ["relatorio.gestante.visualizar"] }];
const USERS: UserSummaryOut[] = [
  { id: 1, email: "gestora@example.test", name: "Gestora", is_admin: true, status: "ativo", role_id: null, prefeitura_ids: [10] },
  { id: 2, email: "ativa@example.test", name: "Usuária Ativa", is_admin: false, status: "ativo", role_id: 7, prefeitura_ids: [10] },
  { id: 3, email: "convite@example.test", name: null, is_admin: false, status: "convidado", role_id: 7, prefeitura_ids: [] },
  { id: 4, email: "inativa@example.test", name: "Usuária Inativa", is_admin: false, status: "desativado", role_id: null, prefeitura_ids: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedUsers.list.mockResolvedValue(USERS);
  mockedUsers.update.mockResolvedValue(USERS[1]);
  mockedUsers.deactivate.mockResolvedValue(undefined);
  mockedUsers.reactivate.mockResolvedValue(undefined);
  mockedUsers.cancelInvitation.mockResolvedValue(undefined);
  mockedPrefeituras.list.mockResolvedValue([{ id: 10, ibge_code: "3500000", name: "Jeriquara", active: true }]);
});

describe("UsersManagement — FLO-55", () => {
  it("mostra ações por estado e impede auto-desativação na interface", async () => {
    render(<UsersManagement currentUserId={1} currentUserIsAdmin roles={ROLES} canAssignPrefeituras={false} />);

    expect(await screen.findByText("Usuária Ativa")).toBeInTheDocument();
    expect(screen.getByText("Convite pendente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar Gestora" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar Gestora" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar Usuária Ativa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar convite de convite@example.test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reativar Usuária Inativa" })).toBeInTheDocument();
    expect(mockedPrefeituras.list).not.toHaveBeenCalled();
  });

  it("não oferece ações sobre administrador a um gestor não administrador", async () => {
    render(
      <UsersManagement
        currentUserId={99}
        currentUserIsAdmin={false}
        roles={ROLES}
        canAssignPrefeituras={false}
      />,
    );

    await screen.findByText("Gestora");
    expect(screen.queryByRole("button", { name: "Editar Gestora" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar Gestora" })).not.toBeInTheDocument();
  });

  it("edita nome e cargo sem enviar escopo que o ator não pode atribuir", async () => {
    const user = userEvent.setup();
    render(<UsersManagement currentUserId={1} currentUserIsAdmin roles={ROLES} canAssignPrefeituras={false} />);
    await screen.findByText("Usuária Ativa");

    await user.click(screen.getByRole("button", { name: "Editar Usuária Ativa" }));
    expect(screen.queryByText("Prefeituras permitidas")).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Nome Atualizado");
    await user.type(screen.getByLabelText("Motivo da alteração"), "Mudança de função");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(mockedUsers.update).toHaveBeenCalledWith(2, {
      name: "Nome Atualizado",
      motivo: "Mudança de função",
    }));
  });

  it("envia prefeituras somente quando a capability foi concedida pelo backend", async () => {
    const user = userEvent.setup();
    render(<UsersManagement currentUserId={1} currentUserIsAdmin roles={ROLES} canAssignPrefeituras />);
    await screen.findByText("Usuária Ativa");

    await user.click(screen.getByRole("button", { name: "Editar Usuária Ativa" }));
    expect(await screen.findByText("Prefeituras permitidas")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Jeriquara" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Jeriquara" }));
    await user.type(screen.getByLabelText("Motivo da alteração"), "Revisão de lotação");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(mockedUsers.update).toHaveBeenCalledWith(2, {
      prefeitura_ids: [],
      motivo: "Revisão de lotação",
    }));
  });

  it.each([
    ["Desativar Usuária Ativa", "Desativar e revogar sessões", mockedUsers.deactivate, 2],
    ["Reativar Usuária Inativa", "Reativar usuário", mockedUsers.reactivate, 4],
    ["Cancelar convite de convite@example.test", "Cancelar convite", mockedUsers.cancelInvitation, 3],
  ] as const)("confirma e registra motivo em %s", async (openLabel, confirmLabel, service, id) => {
    const user = userEvent.setup();
    render(<UsersManagement currentUserId={1} currentUserIsAdmin roles={ROLES} canAssignPrefeituras={false} />);
    await screen.findByText("Usuária Ativa");

    await user.click(screen.getByRole("button", { name: openLabel }));
    const confirm = screen.getByRole("button", { name: confirmLabel });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Motivo"), "Solicitação da gestão");
    await user.click(confirm);

    await waitFor(() => expect(service).toHaveBeenCalledWith(id, { motivo: "Solicitação da gestão" }));
  });

  it("mantém confirmação aberta e mostra a recusa segura do backend", async () => {
    mockedUsers.deactivate.mockRejectedValue(new ApiError(409, "Estado incompatível com a ação."));
    const user = userEvent.setup();
    render(<UsersManagement currentUserId={1} currentUserIsAdmin roles={ROLES} canAssignPrefeituras={false} />);
    await screen.findByText("Usuária Ativa");

    await user.click(screen.getByRole("button", { name: "Desativar Usuária Ativa" }));
    await user.type(screen.getByLabelText("Motivo"), "Solicitação da gestão");
    await user.click(screen.getByRole("button", { name: "Desativar e revogar sessões" }));

    expect(await screen.findByText("Estado incompatível com a ação.")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
