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

async function compararPor(opcao: "Prefeitura" | "Período / importação" | "Parâmetro") {
  await userEvent.click(screen.getByRole("combobox", { name: "Comparar por" }));
  await userEvent.click(await screen.findByRole("option", { name: opcao }));
}

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

  it("seleciona comparação por prefeitura e mostra todas as opções", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");

    await compararPor("Prefeitura");

    expect(await screen.findByRole("checkbox", { name: "Jeriquara" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pedregulho" })).toBeInTheDocument();
  });

  it("no modo comparar, chama comparar() com os ids marcados", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");

    await compararPor("Prefeitura");
    await userEvent.click(await screen.findByRole("checkbox", { name: "Pedregulho" }));

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
    await compararPor("Prefeitura");
    await userEvent.click(await screen.findByRole("checkbox", { name: "Pedregulho" }));
    await userEvent.click(await screen.findByRole("tab", { name: "Visualizações" }));
    await userEvent.click(await screen.findByRole("tab", { name: "Evolução" }));

    await waitFor(() => {
      expect(mockedGestanteService.serieHistorica).toHaveBeenCalledWith(PREFEITURA.id);
      expect(mockedGestanteService.serieHistorica).toHaveBeenCalledWith(OUTRA_PREFEITURA.id);
    });
  });

  it("carrega e seleciona períodos pela série histórica sem buscar endpoint novo", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.serieHistorica.mockResolvedValue([
      ...HISTORICO,
      { ...HISTORICO[0], importacao_id: 2, data_referencia: "2026-02-15T12:00:00Z" },
    ]);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");
    await compararPor("Período / importação");

    expect(await screen.findByRole("checkbox", { name: "Importação de 15/02/2026" })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: "Importação de 15/01/2026" }));
    await waitFor(() => expect(window.location.search).toContain("comparar_por=periodo"));
    expect(window.location.search).toContain("periodos=1%2C2");
    expect(mockedGestanteService.serieHistorica).toHaveBeenCalledWith(PREFEITURA.id);
  });

  it("filtra parâmetros, expõe chips e limpa os filtros ativos", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");
    await compararPor("Parâmetro");
    await userEvent.click(screen.getByRole("checkbox", { name: "Captação precoce" }));

    await waitFor(() => expect(window.location.search).toContain("parametros=A"));
    expect(screen.getByText("Comparar por: parametro")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() => expect(window.location.search).not.toContain("comparar_por"));
  });

  it("remove um único chip sem limpar os demais filtros", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");
    await compararPor("Parâmetro");
    await userEvent.click(screen.getByRole("checkbox", { name: "Captação precoce" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "7+ consultas" }));

    await waitFor(() => expect(window.location.search).toContain("parametros=A%2CB"));
    await userEvent.click(screen.getByRole("button", { name: "Remover parâmetro Captação precoce" }));

    await waitFor(() => expect(window.location.search).toContain("parametros=B"));
    expect(window.location.search).toContain("comparar_por=parametro");
    expect(screen.queryByRole("button", { name: "Remover parâmetro Captação precoce" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover parâmetro 7+ consultas" })).toBeInTheDocument();
  });

  it("restaura uma URL válida após recarregar a página", async () => {
    window.history.replaceState(null, "", "/analytics?indicador=c3&prefeituras=1%2C2&comparar_por=prefeitura&secao=visualizacoes&grafico=ranking");
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);

    const primeiraPagina = render(<AnalyticsPage />);
    expect(await screen.findByRole("checkbox", { name: "Jeriquara" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pedregulho" })).toBeChecked();
    expect(await screen.findByText("Ranking geral")).toBeInTheDocument();

    primeiraPagina.unmount();
    render(<AnalyticsPage />);

    expect(await screen.findByRole("checkbox", { name: "Jeriquara" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pedregulho" })).toBeChecked();
    expect(await screen.findByText("Ranking geral")).toBeInTheDocument();
  });

  it("mantém dados pessoais fora da URL ao alterar filtros", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);

    render(<AnalyticsPage />);
    await screen.findByText("Analytics");
    await compararPor("Prefeitura");
    await userEvent.click(screen.getByRole("checkbox", { name: "Pedregulho" }));

    await waitFor(() => expect(window.location.search).toContain("prefeituras=1%2C2"));
    const url = decodeURIComponent(window.location.search).toLocaleLowerCase("pt-BR");
    expect(url).not.toContain("cpf");
    expect(url).not.toContain("cns");
    expect(url).not.toContain("nome");
    expect(url).not.toContain("jeriquara");
    expect(url).not.toContain("pedregulho");
  });

  it("não oferece dimensões e visualizações ausentes do catálogo", async () => {
    mockedIndicadoresService.catalogo.mockResolvedValue({
      indicadores: [{
        ...INDICADOR,
        dimensoes_comparacao: ["parametro"],
        visualizacoes: ["barra"],
        possui_historico: false,
        possui_lista_nominal: false,
      }],
    });
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);

    render(<AnalyticsPage />);
    await waitFor(() => expect(mockedGestanteService.metricas).toHaveBeenCalledWith(PREFEITURA.id));
    await userEvent.click(screen.getByRole("combobox", { name: "Comparar por" }));

    expect(screen.queryByRole("option", { name: "Prefeitura" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Período / importação" })).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Parâmetro" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("tab", { name: "Visualizações" }));
    expect(screen.getByRole("tab", { name: "barra" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "ranking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Evolução" })).not.toBeInTheDocument();
  });

  it("permite operar comparação e seções somente pelo teclado", async () => {
    mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA, OUTRA_PREFEITURA]);
    mockedGestanteService.metricas.mockResolvedValue(METRICAS);
    mockedGestanteService.comparar.mockResolvedValue([METRICAS, METRICAS_OUTRA]);
    const user = userEvent.setup();

    render(<AnalyticsPage />);
    await waitFor(() => expect(mockedGestanteService.metricas).toHaveBeenCalledWith(PREFEITURA.id));
    const comparar = screen.getByRole("combobox", { name: "Comparar por" });
    comparar.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("option", { name: "Prefeitura" });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(await screen.findByRole("checkbox", { name: "Jeriquara" })).toBeInTheDocument();

    const visaoGeral = screen.getByRole("tab", { name: "Visão geral" });
    visaoGeral.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Visualizações" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "Visualizações" })).toHaveAttribute("aria-selected", "true");
    expect(window.location.search).toContain("secao=visualizacoes");
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
