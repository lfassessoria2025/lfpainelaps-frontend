import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsPage } from "@/pages/analytics-page";
import { ApiError } from "@/lib/http";
import { gestanteService } from "@/services/gestante";
import { prefeiturasService } from "@/services/prefeituras";
import { indicadoresService } from "@/services/indicadores";
import type { IndicadorCatalogoOut, MetricasIndicadorOut, PrefeituraOut, SerieHistoricaPontoOut } from "@/lib/api-types";

vi.mock("@/services/gestante", () => ({
  gestanteService: {
    list: vi.fn(),
    exportar: vi.fn(),
    metricas: vi.fn(),
    comparar: vi.fn(),
    serieHistorica: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));
vi.mock("@/services/indicadores", () => ({
  indicadoresService: { catalogo: vi.fn() },
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
const mockedIndicadoresService = vi.mocked(indicadoresService);

const INDICADOR: IndicadorCatalogoOut = {
  codigo: "c3",
  nome: "Gestantes e puerpério",
  categoria: "Saúde da mulher",
  descricao: "Cumprimento das práticas de acompanhamento.",
  permissao: "relatorio.gestante.visualizar",
  parametros: [
    { codigo: "A", rotulo: "Captação precoce", descricao: "Início oportuno", tipo: "booleano", meta: 1, filtravel: true, ordenavel: true },
    { codigo: "B", rotulo: "7+ consultas", descricao: "Consultas realizadas", tipo: "contagem", meta: 7, filtravel: true, ordenavel: true },
  ],
  dimensoes_comparacao: ["prefeitura", "periodo", "parametro"],
  visualizacoes: ["barra", "pizza", "radar", "ranking", "evolucao"],
  possui_historico: true,
  granularidade_historico: "importacao",
  possui_lista_nominal: true,
};

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

const HISTORICO: SerieHistoricaPontoOut[] = [
  {
    importacao_id: 1,
    data_referencia: "2026-01-15T12:00:00Z",
    total_gestantes: 2,
    praticas: METRICAS.praticas,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/analytics");
  mockedIndicadoresService.catalogo.mockResolvedValue({ indicadores: [INDICADOR] });
});

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

  it("troca para ranking sem buscar as métricas novamente", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);
    await userEvent.click(await screen.findByRole("tab", { name: "Visualizações" }));
    const rankingTab = await screen.findByRole("tab", { name: "ranking" });
    const chamadasAntes = mockedGestanteService.metricas.mock.calls.length;

    await userEvent.click(rankingTab);

    expect(await screen.findByText("Ranking geral")).toBeInTheDocument();
    expect(mockedGestanteService.metricas).toHaveBeenCalledTimes(chamadasAntes);
  });

  it("busca evolução sob demanda e reutiliza o cache ao voltar para a aba", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.serieHistorica.mockResolvedValue(HISTORICO);

    render(<AnalyticsPage />);
    await userEvent.click(await screen.findByRole("tab", { name: "Visualizações" }));
    await userEvent.click(await screen.findByRole("tab", { name: "Evolução" }));
    expect(await screen.findByText("Evolução do cumprimento geral")).toBeInTheDocument();
    expect(mockedGestanteService.serieHistorica).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("tab", { name: "barra" }));
    await userEvent.click(screen.getByRole("tab", { name: "Evolução" }));
    expect(mockedGestanteService.serieHistorica).toHaveBeenCalledTimes(1);
  });

  it("carrega uma série histórica por prefeitura no modo comparação", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);
    mockedGestanteService.serieHistorica.mockResolvedValue(HISTORICO);

    render(<AnalyticsPage />);
    await userEvent.click(await screen.findByRole("switch", { name: /comparar/i }));
    await userEvent.click((await screen.findAllByRole("checkbox"))[1]);
    await userEvent.click(await screen.findByRole("tab", { name: "Visualizações" }));
    await userEvent.click(await screen.findByRole("tab", { name: "Evolução" }));

    await waitFor(() => {
      expect(mockedGestanteService.serieHistorica).toHaveBeenCalledWith(PREFEITURA.id);
      expect(mockedGestanteService.serieHistorica).toHaveBeenCalledWith(OUTRA_PREFEITURA.id);
    });
  });

  it("navega para a tabela e exibe todos os parâmetros do catálogo", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);
    await userEvent.click(await screen.findByRole("tab", { name: "Tabela" }));

    expect(await screen.findByRole("cell", { name: "Captação precoce" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "7+ consultas" })).toBeInTheDocument();
    expect(window.location.search).toContain("secao=tabela");
  });

  it("descarta filtros inválidos da query string e usa o catálogo", async () => {
    window.history.replaceState(null, "", "/analytics?indicador=desconhecido&prefeituras=x&secao=script");
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);

    expect(await screen.findByText("Gestantes e puerpério")).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toContain("indicador=c3"));
    expect(window.location.search).not.toContain("script");
  });
});
