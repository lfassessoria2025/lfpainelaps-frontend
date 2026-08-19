import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResponsibilityTermUnavailableRedirect } from "@/components/responsibility-terms/responsibility-term-unavailable-redirect";
import { RESPONSIBILITY_TERM_UNAVAILABLE_EVENT } from "@/lib/responsibility-term-events";

describe("ResponsibilityTermUnavailableRedirect", () => {
  it("leva o 503 à tela de indisponibilidade", async () => {
    render(
      <MemoryRouter initialEntries={["/importacoes"]}>
        <ResponsibilityTermUnavailableRedirect />
        <Routes>
          <Route path="/importacoes" element={<div>Dados protegidos</div>} />
          <Route path="/termo-indisponivel" element={<div>Tela de indisponibilidade</div>} />
        </Routes>
      </MemoryRouter>,
    );

    window.dispatchEvent(new Event(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT));
    expect(await screen.findByText("Tela de indisponibilidade")).toBeInTheDocument();
  });

  it("não entra em loop quando já está na tela de indisponibilidade", () => {
    render(
      <MemoryRouter initialEntries={["/termo-indisponivel"]}>
        <ResponsibilityTermUnavailableRedirect />
        <Routes><Route path="/termo-indisponivel" element={<div>Tela estável</div>} /></Routes>
      </MemoryRouter>,
    );
    window.dispatchEvent(new Event(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT));
    expect(screen.getByText("Tela estável")).toBeInTheDocument();
  });
});
