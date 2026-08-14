import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { authService } from "@/services/auth";
import { ApiError } from "@/lib/http";

vi.mock("@/services/auth", () => ({
  authService: { forgotPassword: vi.fn() },
}));

const mockedForgotPassword = vi.mocked(authService.forgotPassword);
const MENSAGEM_GENERICA = "Se o e-mail existir, você receberá um link para redefinir a senha.";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/esqueci-senha"]}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  it("mostra a mensagem genérica após enviar, com e-mail existente", async () => {
    mockedForgotPassword.mockResolvedValue({ detail: MENSAGEM_GENERICA });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("E-mail"), "existe@prefeitura.gov.br");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(mockedForgotPassword).toHaveBeenCalledWith({ email: "existe@prefeitura.gov.br" });
    expect(await screen.findByText(MENSAGEM_GENERICA)).toBeInTheDocument();
  });

  it("mostra a MESMA mensagem genérica mesmo se o backend falhar (nunca revela se o e-mail existe)", async () => {
    mockedForgotPassword.mockRejectedValue(new ApiError(500, "erro interno"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("E-mail"), "qualquer@prefeitura.gov.br");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByText(MENSAGEM_GENERICA)).toBeInTheDocument();
  });
});
