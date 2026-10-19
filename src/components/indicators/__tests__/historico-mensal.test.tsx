import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoricoMensal } from "@/components/indicators/historico-mensal";
import type { SerieHistoricaPontoOut } from "@/lib/api-types";

const ponto = (
  data_referencia: string,
  equipe?: { nome: string; ine: string },
): SerieHistoricaPontoOut => ({
  importacao_id: 1,
  data_referencia,
  equipe_nome: equipe?.nome,
  equipe_ine: equipe?.ine,
  total_gestantes: 10,
  unidade: "percentual",
  valor_total: 50,
  praticas: [{
    pratica: "M1",
    titulo: "Indicador",
    total_gestantes: 10,
    total_cumprida: 5,
    percentual_cumprido: 50,
  }],
});

describe("HistoricoMensal", () => {
  it("renderiza datetime ISO do backend sem criar uma data inválida", () => {
    render(<HistoricoMensal pontos={[ponto("2026-10-01T00:00:00")] } />);

    expect(screen.getByText("outubro de 2026")).toBeInTheDocument();
    expect(screen.getByText("3º quadrimestre")).toBeInTheDocument();
  });

  it("mantém compatibilidade com referências somente de data", () => {
    render(<HistoricoMensal pontos={[ponto("2026-02-01")] } />);

    expect(screen.getByText("fevereiro de 2026")).toBeInTheDocument();
    expect(screen.getByText("1º quadrimestre")).toBeInTheDocument();
  });

  it("respeita o filtro externo de equipe usado pelos indicadores", () => {
    render(
      <HistoricoMensal
        pontos={[
          ponto("2026-10-01", { nome: "Equipe A", ine: "INE-A" }),
          ponto("2026-10-01", { nome: "Equipe B", ine: "INE-B" }),
        ]}
        equipeFiltro="INE-A"
        mostrarFiltroEquipe={false}
      />,
    );

    expect(screen.getAllByText("Equipe A").length).toBeGreaterThan(0);
    expect(screen.queryByText("Equipe B")).not.toBeInTheDocument();
  });
});
