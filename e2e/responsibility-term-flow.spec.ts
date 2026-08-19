import { expect, test, type Route } from "@playwright/test";

const term = {
  id: 9,
  version: "2.0",
  title: "Termo de responsabilidade e sigilo",
  content: "Mantenha o sigilo e use os dados apenas para finalidades autorizadas.",
  content_sha256: "b".repeat(64),
  effective_at: "2026-08-15T12:00:00Z",
  accepted: false,
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("um 428 exige reaceite, preserva a rota e não cria loop", async ({ page }) => {
  let accepted = false;
  let acceptancePayload: unknown;

  await page.route("http://localhost:8000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/me") {
      return json(route, {
        id: 1,
        email: "qa@example.test",
        full_name: "QA FLO-68",
        status: "ativo",
        permissions: [],
        role: { id: 1, name: "Administrador", description: null, permissions: [] },
        prefeitura_ids: [1],
        created_at: "2026-08-15T00:00:00Z",
      });
    }
    if (path === "/prefeituras") {
      return json(route, [{ id: 1, ibge_code: "3500000", name: "Jeriquara", active: true }]);
    }
    if (path === "/responsibility-terms/current") {
      return json(route, { ...term, accepted });
    }
    if (path === "/responsibility-terms/current/acceptance") {
      acceptancePayload = route.request().postDataJSON();
      accepted = true;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/gestantes/equipes") || path.endsWith("/gestantes")) {
      if (!accepted) return json(route, { detail: "Aceite do termo de responsabilidade necessário." }, 428);
      return json(route, []);
    }
    return json(route, { detail: "mock ausente" }, 404);
  });

  await page.goto("/gestantes?equipe=ine%3A0001");
  await expect(page).toHaveURL(/\/termo-responsabilidade\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Termo de responsabilidade e sigilo" })).toBeVisible();
  await expect(page.getByText(term.content)).toBeVisible();

  const checkbox = page.getByRole("checkbox");
  const button = page.getByRole("button", { name: "Confirmar responsabilidade e continuar" });
  await expect(checkbox).not.toBeChecked();
  await expect(button).toBeDisabled();
  await checkbox.click();
  await button.click();

  await expect(page).toHaveURL(/\/gestantes\?equipe=ine%3A0001$/);
  await expect(page.getByRole("heading", { name: "Gestantes e puerpério" })).toBeVisible();
  expect(acceptancePayload).toEqual({
    term_id: 9,
    content_sha256: "b".repeat(64),
    acknowledged: true,
  });
  await expect(page).toHaveURL(/\/gestantes/);
});
