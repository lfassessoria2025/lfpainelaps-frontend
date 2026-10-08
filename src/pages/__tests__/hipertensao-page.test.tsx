import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HipertensaoAcompanhamentoOut, PrefeituraOut } from "@/lib/api-types";
import { HipertensaoPage } from "@/pages/hipertensao-page";
import { hipertensaoService } from "@/services/hipertensao";
import { prefeiturasService } from "@/services/prefeituras";

vi.mock("@/services/hipertensao", () => ({
  hipertensaoService: {
    list: vi.fn(),
    equipes: vi.fn(),
    microAreas: vi.fn(),
    fechamento: vi.fn(),
    exportar: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({ prefeiturasService: { list: vi.fn() } }));

const service = vi.mocked(hipertensaoService);
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
const PESSOA: HipertensaoAcompanhamentoOut = {
  id: 40,
  data_referencia: "2026-09-30",
  versao_calculo: "MS-C5-2026-06-21",
  nome_cidadao: "Maria com Hipertensão",
  data_nascimento: "1970-01-10",
  equipe_nome: "ESF Centro",
  equipe_ine: "001",
  micro_area: "01",
  diagnostico_codigo: "I10",
  diagnostico_sistema: "CID-10",
  diagnostico_evidencia_data: "2025-01-01",
  pratica_a_consulta: true,
  pratica_a_evidencia_data: "2026-08-10",
  pratica_b_pressao: true,
  pratica_c_peso_altura: true,
  pratica_d_visitas: false,
  pratica_d_primeira_visita_data: "2026-08-01",
  pratica_d_segunda_visita_data: null,
  pratica_d_automatica_eap: false,
  pontos_obtidos: 75,
  created_at: "2026-09-30T12:00:00Z",
};

beforeEach(() => {
  prefeituraService.list.mockResolvedValue([PREFEITURA]);
  service.list.mockResolvedValue([PESSOA]);
  service.equipes.mockResolvedValue([]);
  service.microAreas.mockResolvedValue([]);
  service.exportar.mockResolvedValue({
    blob: new Blob(["xlsx"]),
    filename: "pessoas_com_hipertensao_c5_20261006.xlsx",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("HipertensaoPage", () => {
  it("exibe o nome da prefeitura ao carregar e ao trocar o município", async () => {
    prefeituraService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    const user = userEvent.setup();
    render(<HipertensaoPage />);

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

  it("exibe diagnóstico, quatro práticas e baixa o recorte atual", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:hipertensao");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<HipertensaoPage />);

    expect(await screen.findAllByText(/CID-10 I10/)).toHaveLength(2);
    expect(screen.getAllByText("Prática D").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 visita em 01/08/2026").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Baixar planilha" }));

    expect(service.exportar).toHaveBeenCalledWith(1, [], []);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:hipertensao");
  });
});
