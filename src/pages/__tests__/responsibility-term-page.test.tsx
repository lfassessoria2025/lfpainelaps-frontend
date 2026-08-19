import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResponsibilityTermPage } from "@/pages/responsibility-term-page";
import { responsibilityTermsService } from "@/services/responsibility-terms";
import { ApiError } from "@/lib/http";
import type { ResponsibilityTermOut } from "@/lib/api-types";

vi.mock("@/services/responsibility-terms", () => ({
  responsibilityTermsService: { current: vi.fn(), acceptCurrent: vi.fn() },
}));

const service = vi.mocked(responsibilityTermsService);
const TERM: ResponsibilityTermOut = {
  id: 1,
  version: "1.0",
  title: "Termo de responsabilidade e sigilo",
  content: "Uso restrito às finalidades autorizadas.",
  content_sha256: "a".repeat(64),
  effective_at: "2026-08-15T12:00:00Z",
  accepted: false,
};

function renderPage(entry = "/termo-responsabilidade?returnTo=%2Fgestantes%3Fequipe%3D1") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/termo-responsabilidade" element={<ResponsibilityTermPage />} />
        <Route path="/gestantes" element={<div>Destino gestantes</div>} />
        <Route path="/" element={<div>Painel seguro</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  service.current.mockResolvedValue(TERM);
  service.acceptCurrent.mockResolvedValue(undefined);
});

describe("ResponsibilityTermPage — reaceite", () => {
  it("não envia aceite falso e retorna à rota pretendida após confirmação", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(TERM.content)).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    const confirm = screen.getByRole("button", { name: "Confirmar responsabilidade e continuar" });
    expect(checkbox).not.toBeChecked();
    expect(confirm).toBeDisabled();
    expect(service.acceptCurrent).not.toHaveBeenCalled();

    await user.click(checkbox);
    await user.click(confirm);
    expect(service.acceptCurrent).toHaveBeenCalledWith({
      term_id: 1,
      content_sha256: "a".repeat(64),
      acknowledged: true,
    });
    expect(await screen.findByText("Destino gestantes")).toBeInTheDocument();
  });

  it("no 409 relê a versão e desmarca a confirmação", async () => {
    const changed = { ...TERM, id: 2, version: "2.0", content: "Responsabilidades atualizadas.", content_sha256: "b".repeat(64) };
    service.current.mockResolvedValueOnce(TERM).mockResolvedValueOnce(changed);
    service.acceptCurrent.mockRejectedValue(new ApiError(409, "Versão divergente"));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(TERM.content);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirmar responsabilidade e continuar" }));

    expect(await screen.findByText(changed.content)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/termo vigente mudou/i)).toBeInTheDocument();
  });

  it("não aceita returnTo externo", async () => {
    const user = userEvent.setup();
    renderPage("/termo-responsabilidade?returnTo=https%3A%2F%2Fexample.com");
    await screen.findByText(TERM.content);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirmar responsabilidade e continuar" }));
    expect(await screen.findByText("Painel seguro")).toBeInTheDocument();
  });
});
