import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FechamentoC7Out, MulherAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { MulheresPage } from "@/pages/mulheres-page";
import { mulherService } from "@/services/mulher";
import { prefeiturasService } from "@/services/prefeituras";

vi.mock("@/services/mulher", () => ({
  mulherService: {
    list: vi.fn(),
    equipes: vi.fn(),
    microAreas: vi.fn(),
    fechamento: vi.fn(),
    exportar: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({ prefeiturasService: { list: vi.fn() } }));

const service = vi.mocked(mulherService);
const prefeituraService = vi.mocked(prefeiturasService);
const PREFEITURA: PrefeituraOut = { id: 1, ibge_code: "3500000", name: "Pedregulho", active: true };
const MULHER: MulherAcompanhamentoOut = {
  id: 10,
  data_referencia: "2026-09-30",
  versao_calculo: "c7-v1",
  nome_cidadao: "Maria da Silva",
  data_nascimento: "1988-02-01",
  equipe_nome: "ESF Centro",
  equipe_ine: "001",
  micro_area: "01",
  pratica_a_aplicavel: true,
  pratica_a_concluida: true,
  pratica_a_evidencia_data: "2026-08-10",
  pratica_a_valida_ate: "2029-08-10",
  pratica_b_aplicavel: true,
  pratica_b_concluida: false,
  pratica_b_evidencia_data: null,
  pratica_c_aplicavel: false,
  pratica_c_concluida: false,
  pratica_c_evidencia_data: null,
  pratica_c_valida_ate: null,
  pratica_d_aplicavel: true,
  pratica_d_concluida: true,
  pratica_d_evidencia_data: "2026-09-01",
  pratica_d_valida_ate: "2028-09-01",
  pontos_obtidos: 50,
  pontos_aplicaveis: 75,
  created_at: "2026-09-30T12:00:00Z",
};
const FECHAMENTO: FechamentoC7Out = {
  data_referencia: "2026-09-30",
  quadrimestre: "3º quadrimestre de 2026",
  quadrimestre_inicio: "2026-09-01",
  quadrimestre_fim: "2026-12-31",
  resumo: { total_mulheres: 1, total_completas: 0, total_pendentes: 1, pontuacao_indicador: 50 },
  praticas: [],
  itens: [{ id: 10, nome_cidadao: "Maria da Silva", data_nascimento: "1988-02-01", equipe_nome: "ESF Centro", equipe_ine: "001", micro_area: "01", pontos_obtidos: 50, pontos_aplicaveis: 75, status: "pendente", praticas_pendentes: ["B"] }],
};

beforeEach(() => {
  prefeituraService.list.mockResolvedValue([PREFEITURA]);
  service.list.mockResolvedValue([MULHER]);
  service.equipes.mockResolvedValue([{ chave: "ine:001", nome: "ESF Centro", ine: "001", total_mulheres: 1, sem_equipe: false }]);
  service.microAreas.mockResolvedValue([{ chave: "01", codigo: "01", total_mulheres: 1, sem_micro_area: false }]);
  service.fechamento.mockResolvedValue(FECHAMENTO);
  service.exportar.mockResolvedValue({
    blob: new Blob(["xlsx"]),
    filename: "mulheres_c7_20261005.xlsx",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("MulheresPage", () => {
  it("mostra as práticas oficiais, evidências e pontuação do C7", async () => {
    render(<MulheresPage />);

    expect((await screen.findAllByText("Maria da Silva")).length).toBeGreaterThan(0);
    const tabela = screen.getByRole("table");
    expect(within(tabela).getByText("Rastreamento do colo do útero")).toBeInTheDocument();
    expect(within(tabela).getByText("Vacinação contra HPV")).toBeInTheDocument();
    expect(within(tabela).getByText("Saúde sexual e reprodutiva")).toBeInTheDocument();
    expect(within(tabela).getByText("Rastreamento do câncer de mama")).toBeInTheDocument();
    expect(within(tabela).getByText("Não se aplica")).toBeInTheDocument();
    expect(within(tabela).getByText("50/75")).toBeInTheDocument();
    expect(within(tabela).queryByText(/\/100/)).not.toBeInTheDocument();
  });

  it("carrega o fechamento com os mesmos filtros", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/mulheres?equipe=ine%3A001&micro_area=01");
    render(<MulheresPage />);
    await screen.findAllByText("Maria da Silva");

    await user.click(screen.getByRole("tab", { name: "Fechamento" }));

    expect(await screen.findByText("Pontuação do indicador")).toBeInTheDocument();
    expect(service.fechamento).toHaveBeenCalledWith(1, ["ine:001"], ["01"], expect.any(AbortSignal));
  });

  it("baixa a planilha C7 com os filtros selecionados", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:mulheres");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    window.history.replaceState({}, "", "/mulheres?equipe=ine%3A001&micro_area=01");
    render(<MulheresPage />);

    await user.click(await screen.findByRole("button", { name: "Baixar planilha" }));

    expect(service.exportar).toHaveBeenCalledWith(1, ["ine:001"], ["01"]);
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mulheres");
  });

  it("explica a ausência da permissão C7", async () => {
    service.list.mockRejectedValue(new ApiError(403, "Sem permissão"));
    render(<MulheresPage />);

    expect(await screen.findByText("Sem permissão para ver este indicador")).toBeInTheDocument();
    expect(screen.getByText(/Visualizar indicador de mulheres \(C7\)/i)).toBeInTheDocument();
  });
});
