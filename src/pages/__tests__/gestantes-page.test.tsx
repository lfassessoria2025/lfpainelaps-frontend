import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GestantesPage } from "@/pages/gestantes-page";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";
import type { GestanteAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";

vi.mock("@/services/gestante", () => ({
  gestanteService: { list: vi.fn() },
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
});
