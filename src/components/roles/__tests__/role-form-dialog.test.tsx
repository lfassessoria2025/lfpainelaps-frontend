import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleFormDialog } from "@/components/roles/role-form-dialog";
import { prefeiturasService } from "@/services/prefeituras";
import { permissionsService, rolesService } from "@/services/roles";

vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));
vi.mock("@/services/roles", () => ({
  permissionsService: { catalog: vi.fn() },
  rolesService: { teamCatalog: vi.fn() },
}));

const mockedPrefeituras = vi.mocked(prefeiturasService);
const mockedPermissions = vi.mocked(permissionsService);
const mockedRoles = vi.mocked(rolesService);

describe("RoleFormDialog — escopo por prefeitura e equipe", () => {
  it("permite escolher uma equipe específica e envia o escopo no cargo", async () => {
    mockedPermissions.catalog.mockResolvedValue({
      permissions: ["relatorio.gestante.visualizar"],
    });
    mockedPrefeituras.list.mockResolvedValue([
      { id: 20, ibge_code: "3537008", name: "Pedregulho", active: true },
    ]);
    mockedRoles.teamCatalog.mockResolvedValue({
      prefeitura_id: 20,
      teams: [
        { key: "ine:1234567", name: "ESF Centro", ine: "1234567" },
        { key: "ine:7654321", name: "ESF Primavera", ine: "7654321" },
      ],
    });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <RoleFormDialog
        open
        onOpenChange={vi.fn()}
        role={null}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Nome do cargo"), "Enfermeira ESF Centro");
    await user.click(await screen.findByRole("checkbox", { name: /Pedregulho/ }));
    const allTeamsSwitch = screen.getByRole("switch", { name: /Todas as equipes/ });
    expect(allTeamsSwitch).toBeChecked();
    await user.click(allTeamsSwitch);

    expect(await screen.findByText("ESF Centro")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /ESF Centro/ }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Enfermeira ESF Centro",
        permissions: [],
        scopes: [
          {
            prefeitura_id: 20,
            all_teams: false,
            team_keys: ["ine:1234567"],
          },
        ],
      }),
    );
  });
});
