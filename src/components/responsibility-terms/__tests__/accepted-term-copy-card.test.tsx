import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AcceptedTermCopyCard } from "@/components/responsibility-terms/accepted-term-copy-card";
import { responsibilityTermsService } from "@/services/responsibility-terms";
import type { AcceptedResponsibilityTermCopyOut, ResponsibilityTermOut } from "@/lib/api-types";

vi.mock("@/services/responsibility-terms", () => ({
  responsibilityTermsService: { current: vi.fn(), acceptedCopy: vi.fn() },
}));

const service = vi.mocked(responsibilityTermsService);
const current: ResponsibilityTermOut = {
  id: 7,
  version: "1.2",
  title: "Termo de responsabilidade e sigilo",
  content: "Dados de saúde devem ser usados somente para finalidades autorizadas.",
  content_sha256: "a".repeat(64),
  effective_at: "2026-08-01T12:00:00Z",
  accepted: true,
};
const acceptedCopy: AcceptedResponsibilityTermCopyOut = {
  ...current,
  accepted_at: "2026-08-15T12:00:00Z",
};

function renderCard() {
  return render(<MemoryRouter><AcceptedTermCopyCard /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  service.current.mockResolvedValue(current);
  service.acceptedCopy.mockResolvedValue(acceptedCopy);
});

describe("AcceptedTermCopyCard", () => {
  it("mostra a cópia aceita, versão e data sem metadados técnicos", async () => {
    renderCard();

    expect(await screen.findByText(acceptedCopy.content)).toBeInTheDocument();
    expect(screen.getByText("Versão 1.2")).toBeInTheDocument();
    expect(screen.getByText(/Aceito em 15 de agosto de 2026/i)).toBeInTheDocument();
    expect(service.acceptedCopy).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(screen.queryByText(/endereço ip|user.?agent/i)).not.toBeInTheDocument();
  });

  it("orienta o usuário a ler o termo quando a versão vigente ainda não foi aceita", async () => {
    service.current.mockResolvedValue({ ...current, accepted: false });
    renderCard();

    const link = await screen.findByRole("link", { name: "Ler termo vigente" });
    expect(link).toHaveAttribute("href", "/termo-responsabilidade?returnTo=%2Fperfil");
    expect(service.acceptedCopy).not.toHaveBeenCalled();
  });
});
