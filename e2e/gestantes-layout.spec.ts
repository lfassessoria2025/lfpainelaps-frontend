import { expect, test, type Route } from "@playwright/test";

const usuario = {
  id: 1,
  email: "qa@example.test",
  full_name: "QA FLO-51",
  status: "active",
  role: { id: 1, name: "Administrador", description: null, permissions: [] },
  prefeitura_ids: [1],
  created_at: "2026-08-15T00:00:00Z",
};

const gestante = {
  id: 10,
  nome_cidadao: "Maria da Silva com nome suficientemente longo",
  data_nascimento: "1995-04-10",
  equipe_nome: "ESF Centro",
  equipe_ine: "0001",
  dt_inicio_gestacao: "2025-01-01",
  dt_fim_gestacao: "2025-10-01",
  dt_fim_puerperio: "2025-12-01",
  excluida_por_aborto: false,
  pratica_a_captacao_precoce: true,
  pratica_b_consultas: 5,
  pratica_c_pressao: 7,
  pratica_d_peso_altura: 6,
  pratica_e_vd_gestacao: 2,
  pratica_f_vacina_dtpa: true,
  pratica_g_exames_1t: true,
  pratica_h_exames_3t: true,
  pratica_i_consulta_puerperio: true,
  pratica_j_vd_puerperio: true,
  pratica_k_saude_bucal: true,
  pontuacao_total: 91,
  condicao_gestante_acao: "nenhuma_acao",
  condicao_gestante_motivo: "cadastro_coerente",
  condicao_gestante_data_referencia: "2026-08-15",
  created_at: "2026-08-15T00:00:00Z",
};

async function responderJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/me") return responderJson(route, usuario);
    if (path === "/prefeituras") {
      return responderJson(route, [{ id: 1, ibge_code: "3500000", name: "Jeriquara", active: true }]);
    }
    if (path.endsWith("/gestantes/equipes")) {
      return responderJson(route, [{ chave: "ine:0001", nome: "ESF Centro", ine: "0001", total_gestantes: 1, sem_equipe: false }]);
    }
    if (path.endsWith("/gestantes")) return responderJson(route, [gestante]);
    await route.fulfill({ status: 404, contentType: "application/json", body: '{"detail":"mock ausente"}' });
  });
});

for (const densidade of ["Confortável", "Compacta"] as const) {
  test(`contém e alinha a tabela completa na densidade ${densidade}`, async ({ page }) => {
    await page.goto("/gestantes");
    await expect(page.getByRole("heading", { name: "Gestantes e puerpério" })).toBeVisible();

    await page.getByRole("tab", { name: "Todos os parâmetros" }).click();
    if (densidade === "Compacta") {
      await page.getByRole("combobox", { name: "Densidade da tabela" }).click();
      await page.getByRole("option", { name: "Compacta" }).click();
    }

    const filtros = [
      page.getByRole("searchbox", { name: /buscar gestante ou equipe/i }),
      page.getByRole("button", { name: "Filtrar por equipe" }),
      page.getByRole("combobox", { name: "Filtrar por parâmetro" }),
      page.getByRole("combobox", { name: "Filtrar por status" }),
      page.getByRole("combobox", { name: "Ordenar gestantes" }),
    ];
    for (const filtro of filtros) await expect(filtro).toBeVisible();

    const regiao = page.getByRole("region", { name: /tabela nominal de gestantes/i });
    const ultimaColuna = page.getByRole("columnheader", { name: "Atualizado em" });
    const cabecalhoSticky = page.getByRole("columnheader", { name: "Gestante" });
    const celulaSticky = page.getByRole("cell").filter({ hasText: "Maria da Silva" }).first();
    const sidebar = page.locator('[data-slot="sidebar-container"]');

    await expect(regiao).toBeVisible();
    await expect.poll(() => regiao.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await regiao.evaluate((el) => { el.scrollLeft = el.scrollWidth - el.clientWidth; });
    await expect.poll(() => regiao.evaluate((el) => Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth)) <= 2)).toBe(true);
    await expect(ultimaColuna).toBeInViewport();

    const geometria = await Promise.all([
      cabecalhoSticky.boundingBox(),
      celulaSticky.boundingBox(),
      sidebar.boundingBox(),
      regiao.boundingBox(),
    ]);
    const [cabecalho, celula, barraLateral, areaTabela] = geometria;
    expect(cabecalho).not.toBeNull();
    expect(celula).not.toBeNull();
    expect(barraLateral).not.toBeNull();
    expect(areaTabela).not.toBeNull();
    expect(Math.abs(cabecalho!.x - celula!.x)).toBeLessThanOrEqual(1);
    expect(cabecalho!.x).toBeGreaterThanOrEqual(barraLateral!.x + barraLateral!.width - 1);
    expect(cabecalho!.x).toBeGreaterThanOrEqual(areaTabela!.x - 1);
    expect(cabecalho!.x + cabecalho!.width).toBeLessThanOrEqual(areaTabela!.x + areaTabela!.width + 1);
    await expect(celulaSticky.locator("[title]")).toHaveAttribute(
      "title",
      "Maria da Silva com nome suficientemente longo",
    );
  });
}
