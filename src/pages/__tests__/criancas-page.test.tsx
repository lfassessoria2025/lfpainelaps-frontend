import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  CriancaAcompanhamentoOut,
  EquipeCriancaOut,
  PrefeituraOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { CriancasPage } from "@/pages/criancas-page";
import { criancaService } from "@/services/crianca";
import { prefeiturasService } from "@/services/prefeituras";

vi.mock("@/services/crianca", () => ({
  criancaService: {
    list: vi.fn(),
    equipes: vi.fn(),
    microAreas: vi.fn(),
    compararEquipes: vi.fn(),
    exportar: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));

const service = vi.mocked(criancaService);
const prefeituraService = vi.mocked(prefeiturasService);
const PREFEITURA: PrefeituraOut = {
  id: 1,
  ibge_code: "3500000",
  name: "Pedregulho",
  active: true,
};
const EQUIPES: EquipeCriancaOut[] = [
  { chave: "ine:0001", nome: "ESF Centro", ine: "0001", total_criancas: 1, sem_equipe: false },
  { chave: "ine:0002", nome: "ESF Rural", ine: "0002", total_criancas: 1, sem_equipe: false },
];
const CRIANCA: CriancaAcompanhamentoOut = {
  id: 10,
  data_referencia: "2026-09-18",
  nome_cidadao: "Alice da Silva",
  data_nascimento: "2026-09-01",
  equipe_nome: "ESF Centro",
  equipe_ine: "0001",
  micro_area: "001",
  primeira_consulta_data: null,
  pratica_a_primeira_consulta_30_dias: false,
  pratica_b_consultas_puericultura: 2,
  pratica_c_peso_altura: 1,
  pratica_d_primeira_visita_30_dias: false,
  pratica_d_segunda_visita_6_meses: false,
  pratica_d_total_visitas_6_meses: 0,
  pratica_d_automatica_eap: false,
  pratica_d_visitas_completas: false,
  vacina_dtp_doses: 1,
  vacina_hepatite_b_doses: 1,
  vacina_hib_doses: 0,
  vacina_polio_doses: 1,
  vacina_triplice_viral_doses: 0,
  vacina_pneumococica_doses: 1,
  pratica_e_esquema_vacinal_completo: false,
  pontuacao_total: 0,
  created_at: "2026-09-18T12:00:00Z",
};

beforeEach(() => {
  prefeituraService.list.mockResolvedValue([PREFEITURA]);
  service.list.mockResolvedValue([CRIANCA]);
  service.equipes.mockResolvedValue(EQUIPES);
  service.microAreas.mockResolvedValue([
    { chave: "001", codigo: "001", total_criancas: 1, sem_micro_area: false },
  ]);
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("CriancasPage", () => {
  it("mostra a lista C2 simples, os cinco cuidados e o cabeçalho fixo", async () => {
    render(<CriancasPage />);

    expect((await screen.findAllByText("Alice da Silva")).length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Prefeitura" })).toHaveTextContent("Pedregulho");
    expect(screen.getByRole("searchbox", { name: /buscar criança ou equipe/i })).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    const tabela = screen.getByRole("table");
    expect(within(tabela).getByText("1ª consulta até 30 dias")).toBeInTheDocument();
    expect(within(tabela).getByText("9 consultas de puericultura")).toBeInTheDocument();
    expect(within(tabela).getByText("Esquemas vacinais")).toBeInTheDocument();
    expect(tabela.querySelector("thead")).toHaveClass("sticky");
    expect(screen.getByRole("region", { name: /tabela nominal de crianças/i })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("não marca como atrasada uma prática cuja janela ainda está aberta", async () => {
    render(<CriancasPage />);

    expect((await screen.findAllByText("Em prazo")).length).toBeGreaterThanOrEqual(2);
  });

  it("explica a pontuação automática da visita para equipe eAP", async () => {
    service.list.mockResolvedValue([
      {
        ...CRIANCA,
        pratica_d_automatica_eap: true,
        pratica_d_visitas_completas: true,
        pontuacao_total: 20,
      },
    ]);

    render(<CriancasPage />);

    const marcadores = await screen.findAllByText("eAP");
    expect(marcadores[0]).toHaveAttribute("title", expect.stringMatching(/tipo 76/i));
  });

  it("compara equipes e aplica a equipe escolhida à lista", async () => {
    service.compararEquipes.mockResolvedValue(
      EQUIPES.map((equipe, indice) => ({
        ...equipe,
        praticas: [
          {
            pratica: "A",
            titulo: "Primeira consulta",
            total_criancas: 1,
            total_cumprida: indice === 0 ? 1 : 0,
            percentual_cumprido: indice === 0 ? 100 : 0,
          },
        ],
      })),
    );
    const user = userEvent.setup();
    render(<CriancasPage />);
    await screen.findAllByText("Alice da Silva");

    await user.click(screen.getByRole("button", { name: "Comparar equipes (2)" }));
    expect(await screen.findByRole("region", { name: "Comparação entre equipes" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ESF Rural/ }));

    await waitFor(() => {
      expect(service.list).toHaveBeenLastCalledWith(
        PREFEITURA.id,
        ["ine:0002"],
        [],
        expect.any(AbortSignal),
      );
    });
  });

  it("exibe 20 crianças por página com navegação numerada", async () => {
    service.list.mockResolvedValue(
      Array.from({ length: 41 }, (_, indice) => ({
        ...CRIANCA,
        id: indice + 1,
        nome_cidadao: `Criança ${String(indice + 1).padStart(2, "0")}`,
      })),
    );
    const user = userEvent.setup();

    render(<CriancasPage />);

    expect(await screen.findByText(/Exibindo 1–20/)).toBeInTheDocument();
    expect(screen.queryByText("Criança 21")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 3" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página 2" }));

    expect((await screen.findAllByText("Criança 21")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Exibindo 21–40/)).toBeInTheDocument();
  });

  it("explica quando o cargo não possui a permissão do C2", async () => {
    service.list.mockRejectedValue(
      new ApiError(403, "Ator não tem a permissão relatorio.crianca.visualizar."),
    );

    render(<CriancasPage />);

    expect(await screen.findByText("Acesso não autorizado")).toBeInTheDocument();
    expect(screen.getByText(/indicador infantil C2/i)).toBeInTheDocument();
  });
});
