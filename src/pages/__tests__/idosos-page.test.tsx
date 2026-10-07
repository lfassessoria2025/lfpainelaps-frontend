import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IdosoAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";
import { IdososPage } from "@/pages/idosos-page";
import { idosoService } from "@/services/idoso";
import { prefeiturasService } from "@/services/prefeituras";

vi.mock("@/services/idoso", () => ({
  idosoService: {
    list: vi.fn(),
    equipes: vi.fn(),
    microAreas: vi.fn(),
    fechamento: vi.fn(),
    exportar: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({ prefeiturasService: { list: vi.fn() } }));

const service = vi.mocked(idosoService);
const prefeituraService = vi.mocked(prefeiturasService);
const PREFEITURA: PrefeituraOut = {
  id: 1,
  ibge_code: "3500000",
  name: "Pedregulho",
  active: true,
};
const OUTRA_PREFEITURA: PrefeituraOut = {
  id: 2,
  ibge_code: "3521903",
  name: "Jeriquara",
  active: true,
};
const IDOSO: IdosoAcompanhamentoOut = {
  id: 20,
  data_referencia: "2026-09-30",
  versao_calculo: "c6-v1",
  nome_cidadao: "José da Silva",
  data_nascimento: "1950-01-10",
  equipe_nome: "ESF Centro",
  equipe_ine: "001",
  micro_area: "01",
  pratica_a_consulta: true,
  pratica_a_evidencia_data: "2026-08-10",
  pratica_b_peso_altura: true,
  pratica_c_visitas: false,
  pratica_c_primeira_visita_data: null,
  pratica_c_segunda_visita_data: null,
  pratica_c_automatica_eap: false,
  pratica_d_influenza: true,
  pratica_d_evidencia_data: "2026-05-10",
  pontos_obtidos: 75,
  created_at: "2026-09-30T12:00:00Z",
};

beforeEach(() => {
  prefeituraService.list.mockResolvedValue([PREFEITURA]);
  service.list.mockResolvedValue([IDOSO]);
  service.equipes.mockResolvedValue([]);
  service.microAreas.mockResolvedValue([]);
  service.exportar.mockResolvedValue({
    blob: new Blob(["xlsx"]),
    filename: "pessoas_idosas_c6_20261005.xlsx",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("IdososPage", () => {
  it("exibe o nome da prefeitura ao carregar e ao trocar o município", async () => {
    prefeituraService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    const user = userEvent.setup();
    render(<IdososPage />);

    const seletor = await screen.findByRole("combobox", { name: "Prefeitura" });
    expect(seletor).toHaveTextContent("Pedregulho");

    await user.click(seletor);
    await user.click(await screen.findByRole("option", { name: "Jeriquara" }));

    expect(seletor).toHaveTextContent("Jeriquara");
    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith(
      2,
      [],
      [],
      expect.any(AbortSignal),
    ));
  });

  it("baixa a planilha C6 do recorte atual", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:idosos");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<IdososPage />);

    await user.click(await screen.findByRole("button", { name: "Baixar planilha" }));

    expect(service.exportar).toHaveBeenCalledWith(1, [], []);
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:idosos");
  });
});
