import { expect, test, type Route } from "@playwright/test";

const usuario = {
  id: 1,
  email: "gestora@example.test",
  full_name: "Gestora municipal",
  is_admin: true,
  status: "ativo",
  permissions: ["cargo.criar", "cargo.editar", "cargo.excluir", "equipe.gerenciar", "prefeitura.atribuir"],
  role: { id: 1, name: "Administradora", description: null, permissions: [] },
  prefeitura_ids: [10],
  created_at: "2026-09-29T00:00:00Z",
};

async function responderJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/me") return responderJson(route, usuario);
    if (path === "/roles") {
      return responderJson(route, [{ id: 7, name: "ACS", permissions: ["relatorio.crianca.visualizar"] }]);
    }
    if (path === "/users") return responderJson(route, []);
    if (path === "/prefeituras") {
      return responderJson(route, [
        { id: 10, ibge_code: "3500000", name: "Pedregulho", active: true },
        { id: 11, ibge_code: "3500001", name: "Jeriquara", active: true },
      ]);
    }
    if (path === "/users/team-catalog") {
      return responderJson(route, {
        prefeitura_id: 10,
        teams: [
          { key: "ine:0001", name: "ESF Centro", ine: "0001" },
          { key: "ine:0002", name: "ESF Primavera", ine: "0002" },
        ],
      });
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: '{"detail":"mock ausente"}' });
  });
});

test("abre o convite amplo e mantém a lotação legível", async ({ page }) => {
  await page.goto("/cargos");
  await page.getByRole("button", { name: "Convidar funcionário" }).click();

  const dialog = page.getByRole("dialog", { name: "Convidar funcionário" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(900);
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width - 40);

  await expect(page.getByText("Dados do convite")).toBeVisible();
  await expect(page.getByText("Lotação e acesso", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Pedregulho/ }).click();
  await expect(page.getByText("ESF Centro")).toBeVisible();
  await expect(page.getByText("ESF Primavera")).toBeVisible();
});
