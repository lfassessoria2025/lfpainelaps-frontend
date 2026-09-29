import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleFormDialog } from "@/components/roles/role-form-dialog";
import { permissionsService } from "@/services/roles";
vi.mock("@/services/roles", () => ({
  permissionsService: { catalog: vi.fn() },
}));

const mockedPermissions = vi.mocked(permissionsService);

describe("RoleFormDialog — cargo reutilizável", () => {
  it("envia somente nome e permissões, sem atrelar prefeitura ou equipe", async () => {
    mockedPermissions.catalog.mockResolvedValue({
      permissions: ["relatorio.gestante.visualizar"],
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

    await user.type(screen.getByLabelText("Nome do cargo"), "Enfermeira");
    await user.click(await screen.findByRole("checkbox", { name: /Visualizar indicador de gestantes/ }));
    await user.click(screen.getByRole("button", { name: "Salvar cargo" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Enfermeira",
        permissions: ["relatorio.gestante.visualizar"],
      }),
    );
    expect(screen.queryByText("Pedregulho")).not.toBeInTheDocument();
  });
});
