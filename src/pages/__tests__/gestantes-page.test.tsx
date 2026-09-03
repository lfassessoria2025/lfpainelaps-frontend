import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GestantesPage } from "@/pages/gestantes-page";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";
import type {
  DiagnosticoC3Out,
  EquipeGestanteOut,
  GestanteAcompanhamentoOut,
  MicroAreaGestanteOut,
  PrefeituraOut,
} from "@/lib/api-types";

vi.mock("@/services/gestante", () => ({
  gestanteService: { list: vi.fn(), equipes: vi.fn(), microAreas: vi.fn(), exportar: vi.fn(), diagnostico: vi.fn() },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));

const mockedGestanteService = vi.mocked(gestanteService);
const mockedPrefeiturasService = vi.mocked(prefeiturasService);

const PREFEITURA: PrefeituraOut = { id: 1, ibge_code: "3500000", name: "Jeriquara", active: true };
const EQUIPES: EquipeGestanteOut[] = [
  { chave: "ine:0001", nome: "ESF Centro", ine: "0001", total_gestantes: 1, sem_equipe: false },
  { chave: "nome:ESF Rural", nome: "ESF Rural", ine: null, total_gestantes: 1, sem_equipe: false },
  { chave: "sem-equipe", nome: null, ine: null, total_gestantes: 1, sem_equipe: true },
];
const MICRO_AREAS: MicroAreaGestanteOut[] = [
  { chave: "001", codigo: "001", total_gestantes: 1, sem_micro_area: false },
  { chave: "sem-micro-area", codigo: null, total_gestantes: 1, sem_micro_area: true },
];
const DIAGNOSTICO: DiagnosticoC3Out = {
  prefeitura_id: 1,
  importacao_id: 99,
  data_referencia: "2026-08-15",
  total_registros: 1,
  coorte: {
    ativas: 1,
    puerperas: 0,
    historicas: 0,
    excluidas_por_aborto: 0,
    referencia_indisponivel: 0,
    conflitos_sinalizados: 0,
    cadastro_coerente: 1,
    condicao_nao_marcada: 0,
    condicao_ainda_marcada: 0,
    cadastro_ausente_ou_nao_informado: 0,
    estado_esperado_indeterminado: 0,
    dados_legados_sem_avaliacao: 0,
    duplicatas_consolidadas: null,
    estado_duplicatas: "nao_observavel_no_resultado_publicado",
  },
  cobertura_praticas: [],
};

beforeEach(() => {
  mockedGestanteService.equipes.mockResolvedValue(EQUIPES);
  mockedGestanteService.microAreas.mockResolvedValue(MICRO_AREAS);
  mockedGestanteService.diagnostico.mockResolvedValue(DIAGNOSTICO);
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

const GESTANTE: GestanteAcompanhamentoOut = {
  id: 10,
  nome_cidadao: "Maria da Silva",
  data_nascimento: "1995-04-10",
  equipe_nome: "ESF Centro",
  equipe_ine: "0001",
  micro_area: "001",
  dt_inicio_gestacao: "2025-01-01",
  dt_fim_gestacao: "2025-10-01",
  dt_fim_puerperio: "2025-12-01",
  excluida_por_aborto: false,
  pratica_a_captacao_precoce: true,
  pratica_b_consultas: 5,
  pratica_c_pressao: 7,
  pratica_d_peso_altura: 0,
  pratica_e_vd_gestacao: 1,
  pratica_f_vacina_dtpa: false,
  pratica_g_exames_1t: true,
  pratica_h_exames_3t: false,
  pratica_k_saude_bucal: false,
  pratica_i_consulta_puerperio: false,
  pratica_j_vd_puerperio: false,
  pontuacao_total: 8,
  condicao_gestante_acao: "inserir",
  condicao_gestante_motivo: "condicao_nao_marcada",
  condicao_gestante_data_referencia: "2026-08-15",
  created_at: "2026-01-01T00:00:00Z",
};

describe("GestantesPage", () => {
  it("carrega a prefeitura ativa e renderiza a lista de gestantes", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);

    render(<GestantesPage />);

    expect((await screen.findAllByText("Maria da Silva")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("ESF Centro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inserir em condição de saúde Gestante").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/última ficha válida não marca/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Referência do dump: 15/08/2026").length).toBeGreaterThan(0);
    expect(await screen.findByText("Acompanhamento operacional da última extração")).toBeInTheDocument();
    expect(screen.getByText(/não substitui o resultado oficial c3 da competência mensal/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Escopos de leitura do C3" })).toBeInTheDocument();
    expect(screen.getByText("Resultado C3 oficial mensal")).toBeInTheDocument();
    expect(screen.getByText("Histórico de acompanhamento")).toBeInTheDocument();
    expect(screen.getByText("Gestantes ativas")).toBeInTheDocument();
    expect(screen.getByText("Puérperas")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Todos os parâmetros" }));

    // O preset completo expõe os parâmetros, sem depender de tooltip.
    expect(screen.getByText("Consultas (7)")).toBeInTheDocument();
    expect(screen.getByText("VD Gestação (3)")).toBeInTheDocument();
    expect(screen.getByText("Início gestação")).toBeInTheDocument();
    expect(screen.getByText("Fim puerpério")).toBeInTheDocument();

    // Legenda de cor (completa/parcial/pendente) presente na tela.
    const legenda = screen.getByText("Situação clínica de acompanhamento C3:").closest("div")!;
    expect(within(legenda).getByText("Completa")).toBeInTheDocument();
    expect(within(legenda).getByText("Parcial")).toBeInTheDocument();
    expect(within(legenda).getByText("Pendente")).toBeInTheDocument();
  });

  it("comunica inconsistências da coorte apenas de forma agregada", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    mockedGestanteService.diagnostico.mockResolvedValue({
      ...DIAGNOSTICO,
      coorte: {
        ...DIAGNOSTICO.coorte,
        historicas: 2,
        excluidas_por_aborto: 1,
        conflitos_sinalizados: 3,
      },
    });

    render(<GestantesPage />);

    expect(await screen.findByText("Atenção à qualidade desta leva")).toBeInTheDocument();
    expect(screen.getByText(/2 registro\(s\) histórico/)).toBeInTheDocument();
    expect(screen.getByText(/3 caso\(s\) sinalizado/)).toBeInTheDocument();
  });

  it.each([
    ["remover", "condicao_ainda_marcada", "Remover condição de saúde Gestante"],
    ["nenhuma_acao", "cadastro_coerente", "Nenhuma ação"],
    ["revisar_cadastro", "cadastro_ausente_ou_nao_informado", "Revisar cadastro da condição Gestante"],
  ] as const)("exibe a ação %s recebida da API", async (acao, motivo, rotulo) => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([
      { ...GESTANTE, condicao_gestante_acao: acao, condicao_gestante_motivo: motivo },
    ]);

    render(<GestantesPage />);

    expect((await screen.findAllByText(rotulo)).length).toBeGreaterThan(0);
  });

  it("separa orientação cadastral da pendência clínica C3", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);

    render(<GestantesPage />);

    expect((await screen.findAllByRole("region", { name: "Pendência de cadastro: condição Gestante" })).length).toBeGreaterThan(0);
    expect(screen.getByText("Situação clínica de acompanhamento C3:")).toBeInTheDocument();
    expect(screen.getAllByText(/não altera a pontuação nem a pendência clínica do c3/i).length).toBeGreaterThan(0);
  });

  it("busca, filtra, ordena e alterna os presets da tabela", async () => {
    const gestantePendente: GestanteAcompanhamentoOut = {
      ...GESTANTE,
      id: 11,
      nome_cidadao: "Ana Souza",
      equipe_nome: "ESF Norte",
      equipe_ine: "0002",
      pratica_a_captacao_precoce: false,
      pratica_b_consultas: 0,
      pratica_c_pressao: 0,
      pratica_d_peso_altura: 0,
      pratica_e_vd_gestacao: 0,
      pratica_f_vacina_dtpa: false,
      pratica_g_exames_1t: false,
      pratica_h_exames_3t: false,
      pratica_i_consulta_puerperio: false,
      pratica_j_vd_puerperio: false,
      pratica_k_saude_bucal: false,
      pontuacao_total: 0,
    };
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE, gestantePendente]);
    const user = userEvent.setup();

    render(<GestantesPage />);

    const contagemInicial = await screen.findByText(/de 2 gestantes/);
    expect(within(contagemInicial).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Essenciais" })).toHaveAttribute("data-active");
    expect(screen.queryByText("Início gestação")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Todos os parâmetros" }));
    expect(screen.getByText("Início gestação")).toBeInTheDocument();
    expect(screen.getByText("Atualizado em")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: /buscar gestante ou equipe/i }), "Norte");
    expect((await screen.findAllByText("Ana Souza")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Maria da Silva")).not.toBeInTheDocument();
    expect(within(screen.getByText(/de 2 gestantes/)).getByText("1")).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: /buscar gestante ou equipe/i }));
    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(await screen.findByRole("option", { name: "Pendente" }));
    expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0);
    expect(screen.queryByText("Maria da Silva")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(await screen.findByRole("option", { name: "Todos os status" }));
    await user.click(screen.getByRole("combobox", { name: "Ordenar gestantes" }));
    await user.click(await screen.findByRole("option", { name: "Maior pontuação" }));
    const linhas = screen.getAllByRole("row");
    expect(within(linhas[1]).getByText("Maria da Silva")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("Ana Souza")).toBeInTheDocument();
  });

  it("pagina a lista e retorna à primeira página ao aplicar uma busca", async () => {
    const muitasGestantes = Array.from({ length: 21 }, (_, indice) => ({
      ...GESTANTE,
      id: indice + 1,
      nome_cidadao: `Gestante ${String(indice + 1).padStart(2, "0")}`,
    }));
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue(muitasGestantes);
    const user = userEvent.setup();

    render(<GestantesPage />);

    expect(await screen.findByText(/Exibindo 1–20/)).toBeInTheDocument();
    expect(screen.queryByText("Gestante 21")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Próxima página" })[0]);
    expect((await screen.findAllByText("Gestante 21")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Exibindo 21–21/).length).toBeGreaterThan(0);

    await user.type(
      screen.getByRole("searchbox", { name: /buscar gestante ou equipe/i }),
      "Gestante 01",
    );
    expect(await screen.findByText(/Exibindo 1–1/)).toBeInTheDocument();
    expect(screen.getAllByText("Gestante 01").length).toBeGreaterThan(0);
  });

  it("filtra por múltiplas equipes e mantém lista e URL no mesmo recorte", async () => {
    const gestanteSemEquipe = {
      ...GESTANTE,
      id: 12,
      nome_cidadao: "Joana Sem Equipe",
      equipe_nome: null,
      equipe_ine: null,
    };
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockImplementation(async (_prefeituraId, equipes = []) =>
      equipes.includes("ine:0001") || equipes.includes("sem-equipe")
        ? [GESTANTE, gestanteSemEquipe]
        : [GESTANTE],
    );
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");

    await user.click(screen.getByRole("button", { name: "Filtrar por equipe" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /ESF Centro.*INE 0001/i }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /Sem equipe.*Sem INE/i }));

    await waitFor(() => {
      expect(mockedGestanteService.list).toHaveBeenLastCalledWith(
        PREFEITURA.id,
        ["ine:0001", "sem-equipe"],
        [],
        expect.any(AbortSignal),
      );
    });
    expect(new URLSearchParams(window.location.search).getAll("equipe")).toEqual([
      "ine:0001",
      "sem-equipe",
    ]);
    expect(screen.getByText("2 equipes")).toBeInTheDocument();
    expect(screen.getAllByText("Joana Sem Equipe").length).toBeGreaterThan(0);

    mockedGestanteService.exportar.mockResolvedValue({
      blob: new Blob(["conteudo"]),
      filename: "gestantes_filtradas.xlsx",
    });
    const createObjectURL = vi.fn(() => "blob:equipes");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    await user.click(screen.getByRole("button", { name: /baixar planilha/i }));
    expect(mockedGestanteService.exportar).toHaveBeenCalledWith(
      PREFEITURA.id,
      ["ine:0001", "sem-equipe"],
      [],
    );
    vi.unstubAllGlobals();
  });

  it("filtra por múltiplas micro-áreas e mantém lista e URL no mesmo recorte", async () => {
    const gestanteSemMicroArea = {
      ...GESTANTE,
      id: 13,
      nome_cidadao: "Rita Sem Micro-área",
      micro_area: null,
    };
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockImplementation(async (_prefeituraId, _equipes = [], microAreas = []) =>
      microAreas.includes("001") || microAreas.includes("sem-micro-area")
        ? [GESTANTE, gestanteSemMicroArea]
        : [GESTANTE],
    );
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");

    await user.click(screen.getByRole("button", { name: "Filtrar por micro-área" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /^001/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /Sem micro-área/i }));

    await waitFor(() => {
      expect(mockedGestanteService.list).toHaveBeenLastCalledWith(
        PREFEITURA.id,
        [],
        ["001", "sem-micro-area"],
        expect.any(AbortSignal),
      );
    });
    expect(new URLSearchParams(window.location.search).getAll("micro_area")).toEqual([
      "001",
      "sem-micro-area",
    ]);
    expect(screen.getByText("2 micro-áreas")).toBeInTheDocument();
    expect(screen.getAllByText("Rita Sem Micro-área").length).toBeGreaterThan(0);
  });

  it("limpa equipes ao trocar de prefeitura e carrega somente o novo catálogo", async () => {
    const outraPrefeitura: PrefeituraOut = {
      id: 2,
      ibge_code: "3501008",
      name: "Outra cidade",
      active: true,
    };
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, outraPrefeitura]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    mockedGestanteService.equipes.mockImplementation(async (prefeituraId) =>
      prefeituraId === PREFEITURA.id
        ? EQUIPES
        : [{ chave: "ine:9999", nome: "ESF Nova", ine: "9999", total_gestantes: 1, sem_equipe: false }],
    );
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");
    await user.click(screen.getByRole("button", { name: "Filtrar por equipe" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /ESF Centro.*INE 0001/i }));
    await waitFor(() => expect(window.location.search).toContain("equipe=ine%3A0001"));

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "Outra cidade" }));

    await waitFor(() => expect(mockedGestanteService.equipes).toHaveBeenLastCalledWith(2, expect.any(AbortSignal)));
    expect(window.location.search).toBe("");
    expect(mockedGestanteService.list).toHaveBeenLastCalledWith(2, [], [], expect.any(AbortSignal));
  });

  it("filtra e ordena pelo parâmetro individual selecionado", async () => {
    const gestantePendente: GestanteAcompanhamentoOut = {
      ...GESTANTE,
      id: 11,
      nome_cidadao: "Ana Souza",
      pratica_b_consultas: 0,
      pontuacao_total: 10,
    };
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE, gestantePendente]);
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findByText(/de 2 gestantes/);

    await user.click(screen.getByRole("combobox", { name: "Filtrar por parâmetro" }));
    await user.click(await screen.findByRole("option", { name: "B · Consultas (7)" }));
    expect(screen.getByText("Status do parâmetro")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(await screen.findByRole("option", { name: "Parcial" }));
    expect(screen.getAllByText("Maria da Silva").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(await screen.findByRole("option", { name: "Todos os status" }));
    await user.click(screen.getByRole("combobox", { name: "Ordenar gestantes" }));
    await user.click(await screen.findByRole("option", { name: "Parâmetro: pior resultado" }));

    const linhas = screen.getAllByRole("row");
    expect(within(linhas[1]).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("Maria da Silva")).toBeInTheDocument();
  });

  it("personaliza colunas e altera a densidade da tabela", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");

    await user.click(screen.getByRole("tab", { name: "Personalizado" }));
    const escolherColunas = screen.getByRole("button", { name: "Escolher colunas visíveis" });
    await user.click(escolherColunas);
    const nascimento = await screen.findByRole("menuitemcheckbox", { name: "Nascimento" });
    expect(nascimento).toHaveAttribute("aria-checked", "false");
    await user.click(nascimento);

    expect(within(screen.getByRole("table")).getByText("Nascimento")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Densidade da tabela" }));
    await user.click(await screen.findByRole("option", { name: "Compacta" }));
    expect(screen.getByRole("table")).toHaveClass("[&_td]:py-1");
  });

  it("expõe todos os parâmetros no card progressivo com controle acessível", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");

    const expandir = screen.getByRole("button", { name: "Ver todos os parâmetros" });
    expect(expandir).toHaveAttribute("aria-expanded", "false");
    await user.click(expandir);

    expect(expandir).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ocultar detalhes")).toBeInTheDocument();
    expect(screen.getByText("Elegibilidade")).toBeInTheDocument();
    expect(screen.getByText("K · Odonto")).toBeInTheDocument();
    expect(document.getElementById("detalhes-gestante-10")).toBeInTheDocument();
  });

  it("permite expandir o card mobile pelo teclado", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    const user = userEvent.setup();
    window.innerWidth = 375;

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");

    const listaMobile = screen.getByRole("generic", { name: "Gestantes encontradas" });
    expect(listaMobile).toHaveClass("md:hidden");
    const expandir = screen.getByRole("button", { name: "Ver todos os parâmetros" });
    expandir.focus();
    await user.keyboard("{Enter}");

    expect(expandir).toHaveAttribute("aria-expanded", "true");
    expect(expandir).toHaveAttribute("aria-controls", "detalhes-gestante-10");
    expect(document.activeElement).toBe(expandir);
  });

  it("expõe affordance e região focável quando a tabela tem overflow", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");

    const regiao = screen.getByRole("region", {
      name: /tabela nominal de acompanhamento operacional; use as setas esquerda e direita/i,
    });
    expect(regiao).toHaveAttribute("data-slot", "table-container");
    expect(regiao).toHaveClass("overflow-x-auto", "max-w-full", "overscroll-x-contain");
    expect(regiao.closest('[data-slot="card"]')).not.toHaveClass("overflow-x-auto");
    Object.defineProperties(regiao, {
      clientWidth: { configurable: true, value: 500 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.scroll(regiao);

    await waitFor(() => expect(screen.getByTestId("overflow-direita")).toHaveClass("opacity-100"));
    expect(regiao).toHaveAttribute("tabindex", "0");

    regiao.scrollLeft = 400;
    fireEvent.scroll(regiao);
    await waitFor(() => expect(screen.getByTestId("overflow-esquerda")).toHaveClass("opacity-100"));

    regiao.focus();
    fireEvent.keyDown(regiao, { key: "Home" });
    expect(regiao.scrollLeft).toBe(0);
    fireEvent.keyDown(regiao, { key: "End" });
    expect(regiao.scrollLeft).toBe(400);
  });

  it("mantém a página contida quando abre todos os parâmetros", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    const user = userEvent.setup();

    render(<GestantesPage />);
    await screen.findAllByText("Maria da Silva");
    await user.click(screen.getByRole("tab", { name: "Todos os parâmetros" }));

    const tabela = screen.getByRole("table");
    const regiao = screen.getByRole("region", {
      name: /tabela nominal de acompanhamento operacional; use as setas esquerda e direita/i,
    });
    const card = regiao.closest('[data-slot="card"]');

    expect(screen.getByRole("combobox", { name: "Filtrar por parâmetro" })).toBeVisible();
    expect(regiao).toContainElement(tabela);
    expect(card).toHaveClass("min-w-0", "max-w-full");
    expect(within(tabela).getByText("Pontuação")).toBeInTheDocument();
    expect(within(tabela).getByText("Atualizado em")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há gestantes para a prefeitura", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([]);
    mockedGestanteService.equipes.mockResolvedValue([]);
    mockedGestanteService.microAreas.mockResolvedValue([]);

    render(<GestantesPage />);

    expect(await screen.findByText("Nenhuma gestante em acompanhamento")).toBeInTheDocument();
  });

  it("desabilita o seletor de prefeitura quando não há nenhuma cadastrada", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([]);

    render(<GestantesPage />);

    expect(
      await screen.findByText("Cadastre uma prefeitura para visualizar o indicador de gestantes."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("mostra mensagem de acesso negado quando a API retorna 403", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockRejectedValue(
      new ApiError(403, "Ator não tem a permissão relatorio.gestante.visualizar."),
    );

    render(<GestantesPage />);

    expect(await screen.findByText("Sem permissão para ver este indicador")).toBeInTheDocument();
  });

  it("não mostra o botão de baixar planilha quando não há gestantes", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([]);

    render(<GestantesPage />);

    expect(await screen.findByText("Nenhuma gestante em acompanhamento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /baixar planilha/i })).not.toBeInTheDocument();
  });

  it("baixa a planilha ao clicar em 'Baixar planilha'", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    mockedGestanteService.exportar.mockResolvedValue({
      blob: new Blob(["conteudo"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      filename: "gestantes_Jeriquara_20260813.xlsx",
    });

    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    render(<GestantesPage />);
    const botao = await screen.findByRole("button", { name: /baixar planilha/i });

    await userEvent.click(botao);

    expect(mockedGestanteService.exportar).toHaveBeenCalledWith(PREFEITURA.id, [], []);
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    vi.unstubAllGlobals();
  });

  it("mostra erro se a exportação falhar", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);
    mockedGestanteService.exportar.mockRejectedValue(
      new ApiError(403, "Ator não tem a permissão relatorio.gestante.visualizar."),
    );

    render(<GestantesPage />);
    const botao = await screen.findByRole("button", { name: /baixar planilha/i });

    await userEvent.click(botao);

    expect(
      await screen.findByText("Ator não tem a permissão relatorio.gestante.visualizar."),
    ).toBeInTheDocument();
  });
});
