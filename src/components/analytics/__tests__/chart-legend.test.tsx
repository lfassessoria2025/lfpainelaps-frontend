import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartLegend } from "@/components/analytics/chart-legend";
import { CORES_COMPARACAO, corDaSerie } from "@/components/analytics/chart-colors";

describe("ChartLegend", () => {
  it("associa cada série a texto e uma cor estável", () => {
    render(<ChartLegend items={[
      { id: 1, label: "Jeriquara" },
      { id: 2, label: "Pedregulho" },
    ]} />);

    expect(screen.getByRole("list", { name: "Legenda das prefeituras comparadas" })).toBeInTheDocument();
    expect(screen.getByText("Jeriquara")).toBeInTheDocument();
    expect(screen.getByText("Pedregulho")).toBeInTheDocument();
    expect(corDaSerie(0)).toBe(CORES_COMPARACAO[0]);
    expect(corDaSerie(CORES_COMPARACAO.length)).toBe(CORES_COMPARACAO[0]);
    expect(new Set(CORES_COMPARACAO).size).toBe(CORES_COMPARACAO.length);
  });

  it("não mostra uma legenda quando não há comparação", () => {
    render(<ChartLegend items={[{ id: 1, label: "Jeriquara" }]} />);

    expect(screen.queryByRole("list", { name: "Legenda das prefeituras comparadas" })).not.toBeInTheDocument();
  });
});
