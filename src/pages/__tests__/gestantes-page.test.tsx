import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GestantesPage } from "@/pages/gestantes-page";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";
import type { GestanteAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";

vi.mock("@/services/gestante", () => ({
  gestanteService: { list: vi.fn(), exportar: vi.fn() },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));

const mockedGestanteService = vi.mocked(gestanteService);
const mockedPrefeiturasService = vi.mocked(prefeiturasService);

const PREFEITURA: PrefeituraOut = { id: 1, ibge_code: "3500000", name: "Jeriquara", active: true };

const GESTANTE: GestanteAcompanhamentoOut = {
  id: 10,
  nome_cidadao: "Maria da Silva",
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
  pratica_d_peso_altura: 0,
  pratica_e_vd_gestacao: 1,
  pratica_f_vacina_dtpa: false,
  pratica_g_exames_1t: true,
  pratica_h_exames_3t: false,
  pratica_k_saude_bucal: false,
  pratica_i_consulta_puerperio: false,
  pratica_j_vd_puerperio: false,
  pontuacao_total: 8,
  created_at: "2026-01-01T00:00:00Z",
};

describe("GestantesPage", () => {
  it("carrega a prefeitura ativa e renderiza a lista de gestantes", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([GESTANTE]);

    render(<GestantesPage />);

    expect(await screen.findByText("Maria da Silva")).toBeInTheDocument();
    expect(screen.getByText("ESF Centro")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    // Nome completo da prática sempre visível no cabeçalho, não só a letra
    // escondida no tooltip (pedido explícito da cliente, fatia FLO-28).
    expect(screen.getByText("Consultas (7)")).toBeInTheDocument();
    expect(screen.getByText("VD Gestação (3)")).toBeInTheDocument();

    // Legenda de cor (completa/parcial/pendente) presente na tela.
    const legenda = screen.getByText("Legenda:").closest("div")!;
    expect(within(legenda).getByText("Completa")).toBeInTheDocument();
    expect(within(legenda).getByText("Parcial")).toBeInTheDocument();
    expect(within(legenda).getByText("Pendente")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há gestantes para a prefeitura", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.list.mockResolvedValue([]);

    render(<GestantesPage />);

    expect(await screen.findByText("Nenhuma gestante em acompanhamento")).toBeInTheDocument();
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

    expect(mockedGestanteService.exportar).toHaveBeenCalledWith(PREFEITURA.id);
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
