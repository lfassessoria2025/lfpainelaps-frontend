import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResponsibilityTermRedirect } from "@/components/responsibility-terms/responsibility-term-redirect";
import { RESPONSIBILITY_TERM_REQUIRED_EVENT } from "@/lib/responsibility-term-events";

describe("ResponsibilityTermRedirect", () => {
  it("leva o 428 à tela de reaceite preservando a rota", async () => {
    render(
      <MemoryRouter initialEntries={["/gestantes?equipe=1"]}>
        <ResponsibilityTermRedirect />
        <Routes>
          <Route path="/gestantes" element={<div>Dados protegidos</div>} />
          <Route path="/termo-responsabilidade" element={<div>Tela de reaceite</div>} />
        </Routes>
      </MemoryRouter>,
    );

    window.dispatchEvent(new Event(RESPONSIBILITY_TERM_REQUIRED_EVENT));
    expect(await screen.findByText("Tela de reaceite")).toBeInTheDocument();
  });

  it("não entra em loop quando já está na tela do termo", () => {
    render(
      <MemoryRouter initialEntries={["/termo-responsabilidade?returnTo=%2Fgestantes"]}>
        <ResponsibilityTermRedirect />
        <Routes><Route path="/termo-responsabilidade" element={<div>Tela estável</div>} /></Routes>
      </MemoryRouter>,
    );
    window.dispatchEvent(new Event(RESPONSIBILITY_TERM_REQUIRED_EVENT));
    expect(screen.getByText("Tela estável")).toBeInTheDocument();
  });
});
