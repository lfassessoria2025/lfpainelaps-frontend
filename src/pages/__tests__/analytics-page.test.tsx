import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsPage } from "@/pages/analytics-page";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";
import type { MetricasIndicadorOut, PrefeituraOut } from "@/lib/api-types";

vi.mock("@/services/gestante", () => ({
  gestanteService: { list: vi.fn(), exportar: vi.fn(), metricas: vi.fn(), comparar: vi.fn() },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

const mockedGestanteService = vi.mocked(gestanteService);
const mockedPrefeiturasService = vi.mocked(prefeiturasService);

const PREFEITURA: PrefeituraOut = { id: 1, ibge_code: "3500000", name: "Jeriquara", active: true };
const OUTRA_PREFEITURA: PrefeituraOut = {
  id: 2,
  ibge_code: "3500001",
  name: "Pedregulho",
  active: true,
};

const METRICAS: MetricasIndicadorOut = {
  prefeitura_id: 1,
  prefeitura_nome: "Jeriquara",
  total_gestantes: 2,
  praticas: [
    { pratica: "A", titulo: "Captação precoce", total_gestantes: 2, total_cumprida: 1, percentual_cumprido: 50 },
    { pratica: "B", titulo: "7+ consultas", total_gestantes: 2, total_cumprida: 2, percentual_cumprido: 100 },
  ],
};

const METRICAS_OUTRA: MetricasIndicadorOut = {
  ...METRICAS,
  prefeitura_id: 2,
  prefeitura_nome: "Pedregulho",
};

describe("AnalyticsPage", () => {
  it("carrega a prefeitura ativa e renderiza o gráfico com as métricas", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);

    expect(await screen.findByText("Analytics")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedGestanteService.metricas).toHaveBeenCalledWith(PREFEITURA.id),
    );
  });

  it("mostra estado vazio quando a prefeitura não tem gestantes", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue({
      ...METRICAS,
      total_gestantes: 0,
      praticas: [],
    });

    render(<AnalyticsPage />);

    expect(await screen.findByText("Sem dado suficiente")).toBeInTheDocument();
  });

  it("mostra mensagem de acesso negado quando a API retorna 403", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockRejectedValue(
      new ApiError(403, "Ator não tem a permissão relatorio.gestante.visualizar."),
    );

    render(<AnalyticsPage />);

    expect(await screen.findByText("Sem permissão para ver este indicador")).toBeInTheDocument();
  });

  it("mostra erro de carregamento em falha inesperada", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockRejectedValue(new ApiError(500, "Erro inesperado."));

    render(<AnalyticsPage />);

    expect(await screen.findByText("Não foi possível carregar")).toBeInTheDocument();
  });

  it("liga o modo comparar e mostra checkboxes de todas as prefeituras", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");

    const toggle = screen.getByRole("switch", { name: /comparar entre prefeituras/i });
    await userEvent.click(toggle);

    expect(await screen.findByText("Jeriquara")).toBeInTheDocument();
    expect(screen.getByText("Pedregulho")).toBeInTheDocument();
  });

  it("no modo comparar, chama comparar() com os ids marcados", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");

    await userEvent.click(screen.getByRole("switch", { name: /comparar entre prefeituras/i }));
    await screen.findByText("Pedregulho");
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[1]);

    await waitFor(() =>
      expect(mockedGestanteService.comparar).toHaveBeenCalledWith(
        expect.arrayContaining([PREFEITURA.id, OUTRA_PREFEITURA.id]),
      ),
    );
  });
});
