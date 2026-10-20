import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type {
  FechamentoVinculoOut,
  PrefeituraOut,
  VinculoOut,
} from "@/lib/api-types";
import { VinculoPage } from "@/pages/vinculo-page";
import { analyticsService } from "@/services/analytics";
import { prefeiturasService } from "@/services/prefeituras";
import { vinculoService } from "@/services/vinculo";

vi.mock("@/services/analytics", () => ({
  analyticsService: { historico: vi.fn() },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));
vi.mock("@/services/vinculo", () => ({
  vinculoService: {
    list: vi.fn(),
    fechamento: vi.fn(),
    exportar: vi.fn(),
  },
}));

const prefeituraService = vi.mocked(prefeiturasService);
const analytics = vi.mocked(analyticsService);
const service = vi.mocked(vinculoService);

const PREFEITURA: PrefeituraOut = {
  id: 3,
  ibge_code: "3537007",
  name: "Pedregulho",
  active: true,
};

const EQUIPE: VinculoOut = {
  id: 22,
  data_referencia: "2026-09-30",
  versao_calculo: "v1",
  indicador: "V1",
  equipe_nome: "ESF Centro",
  equipe_ine: "0001599011",
  parametro: 2300,
  pessoas_cadastradas: 1917,
  cadastro_ponderado: 1963.5,
  pessoas_acompanhadas: 1489,
  acompanhamento_ponderado: 1578.8,
  indice_cadastro: 0.85,
  indice_acompanhamento: 0.8,
  pontos_cadastro: 4,
  pontos_acompanhamento: 4.25,
  pontos_total: 8.25,
  percentual_cadastro: 85,
  percentual_acompanhamento: 80,
  created_at: "2026-09-30T12:00:00Z",
};

const FECHAMENTO: FechamentoVinculoOut = {
  indicador: "V1",
  data_referencia: "2026-09-30",
  parametro_configurado: true,
  pessoas_cadastradas: EQUIPE.pessoas_cadastradas,
  cadastro_ponderado: EQUIPE.cadastro_ponderado,
  pessoas_acompanhadas: EQUIPE.pessoas_acompanhadas,
  acompanhamento_ponderado: EQUIPE.acompanhamento_ponderado,
  pontos_total: EQUIPE.pontos_total,
  equipes: [EQUIPE],
};

beforeEach(() => {
  prefeituraService.list.mockResolvedValue([PREFEITURA]);
  service.fechamento.mockResolvedValue(FECHAMENTO);
  analytics.historico.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("VinculoPage", () => {
  it("renderiza as equipes do mesmo fechamento usado pelos cards", async () => {
    render(<VinculoPage />);

    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByText("ESF Centro")).toBeInTheDocument();
    expect(within(tabela).getByText("0001599011")).toBeInTheDocument();
    expect(within(tabela).getByText("1.917")).toBeInTheDocument();
    expect(service.fechamento).toHaveBeenCalledWith(3, expect.any(AbortSignal));
    expect(service.list).not.toHaveBeenCalled();
  });
});
