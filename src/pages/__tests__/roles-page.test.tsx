import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RolesPage } from "@/pages/roles-page";
import { useAuth } from "@/contexts/auth-context";
import { rolesService } from "@/services/roles";

vi.mock("@/contexts/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/roles", () => ({
  rolesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock("@/components/roles/users-management", () => ({
  UsersManagement: ({ canAssignPrefeituras }: { canAssignPrefeituras: boolean }) => (
    <div>Gestão de usuários {canAssignPrefeituras ? "com prefeituras" : "sem prefeituras"}</div>
  ),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedRoles = vi.mocked(rolesService);

function mockAuth(permissions: Array<"cargo.criar" | "cargo.editar" | "cargo.excluir" | "equipe.gerenciar" | "prefeitura.atribuir">) {
  mockedUseAuth.mockReturnValue({
    user: { id: 1, email: "gestora@example.test", name: "Gestora", is_admin: false, status: "ativo", permissions },
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    setAuthenticatedUser: vi.fn(),
  });
}

beforeEach(() => {
  mockedRoles.list.mockResolvedValue([{ id: 7, name: "Enfermeira", permissions: [] }]);
});

describe("RolesPage — RBAC visual do FLO-55", () => {
  it("não renderiza gestão nem ações quando capabilities estão ausentes", async () => {
    mockAuth([]);
    render(<RolesPage />);

    expect(await screen.findByText("Enfermeira")).toBeInTheDocument();
    expect(screen.queryByText(/Gestão de usuários/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Novo cargo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar Enfermeira" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir Enfermeira" })).not.toBeInTheDocument();
  });

  it("renderiza capacidades de equipe e prefeitura somente quando concedidas pelo backend", async () => {
    mockAuth(["cargo.criar", "cargo.editar", "cargo.excluir", "equipe.gerenciar", "prefeitura.atribuir"]);
    render(<RolesPage />);

    expect(await screen.findByText("Gestão de usuários com prefeituras")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo cargo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar Enfermeira" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir Enfermeira" })).toBeInTheDocument();
  });
});
