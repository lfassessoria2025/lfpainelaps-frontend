import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DiabetesAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";
import { DiabetesPage } from "@/pages/diabetes-page";
import { diabetesService } from "@/services/diabetes";
import { prefeiturasService } from "@/services/prefeituras";

vi.mock("@/services/diabetes", () => ({
  diabetesService: {
    list: vi.fn(),
    equipes: vi.fn(),
    microAreas: vi.fn(),
    fechamento: vi.fn(),
    exportar: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({ prefeiturasService: { list: vi.fn() } }));

const service = vi.mocked(diabetesService);
const prefeituraService = vi.mocked(prefeiturasService);
const PREFEITURA: PrefeituraOut = {
  id: 1,
  ibge_code: "3500000",
  name: "Pedregulho",
  active: true,
};
const PESSOA: DiabetesAcompanhamentoOut = {
  id: 40,
  data_referencia: "2026-09-30",
  versao_calculo: "MS-C4-2026-06-21",
  nome_cidadao: "Maria com Diabetes",
  data_nascimento: "1970-01-10",
  equipe_nome: "ESF Centro",
  equipe_ine: "001",
  micro_area: "01",
  diagnostico_codigo: "E11",
  diagnostico_sistema: "CID-10",
  diagnostico_evidencia_data: "2025-01-01",
  pratica_a_consulta: true,
  pratica_a_evidencia_data: "2026-08-10",
  pratica_b_pressao: true,
  pratica_c_peso_altura: true,
  pratica_d_visitas: false,
  pratica_d_primeira_visita_data: null,
  pratica_d_segunda_visita_data: null,
  pratica_d_automatica_eap: false,
  pratica_e_hemoglobina_glicada: true,
  pratica_e_evidencia_data: "2026-06-01",
  pratica_e_procedimento: "ABEX008",
  pratica_f_avaliacao_pes: false,
  pratica_f_evidencia_data: null,
  pontos_obtidos: 65,
  created_at: "2026-09-30T12:00:00Z",
};

beforeEach(() => {
  prefeituraService.list.mockResolvedValue([PREFEITURA]);
  service.list.mockResolvedValue([PESSOA]);
  service.equipes.mockResolvedValue([]);
  service.microAreas.mockResolvedValue([]);
  service.exportar.mockResolvedValue({
    blob: new Blob(["xlsx"]),
    filename: "pessoas_com_diabetes_c4_20261006.xlsx",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("DiabetesPage", () => {
  it("exibe diagnóstico, seis práticas e baixa o recorte atual", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:diabetes");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<DiabetesPage />);

    expect(await screen.findAllByText(/CID-10 E11/)).toHaveLength(2);
    expect(screen.getAllByText("Prática F").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Baixar planilha" }));

    expect(service.exportar).toHaveBeenCalledWith(1, [], []);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:diabetes");
  });
});
