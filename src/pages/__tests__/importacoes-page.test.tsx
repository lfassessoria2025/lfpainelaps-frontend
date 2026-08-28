import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportacoesPage } from "@/pages/importacoes-page";
import { importacoesService } from "@/services/importacoes";
import { prefeiturasService } from "@/services/prefeituras";
import type { ImportacaoOut, PrefeituraOut } from "@/lib/api-types";

vi.mock("@/services/importacoes", () => ({
  importacoesService: {
    list: vi.fn(),
    get: vi.fn(),
    start: vi.fn(),
    uploadInstructions: vi.fn(),
    confirmUpload: vi.fn(),
    uploadFile: vi.fn(),
    startMultipart: vi.fn(),
    getMultipart: vi.fn(),
    uploadPartInstructions: vi.fn(),
    uploadPart: vi.fn(),
    completeMultipart: vi.fn(),
    abortMultipart: vi.fn(),
    rename: vi.fn(),
    retry: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("@/services/prefeituras", () => ({
  prefeiturasService: { list: vi.fn() },
}));

const mockedImportacoesService = vi.mocked(importacoesService);
const mockedPrefeiturasService = vi.mocked(prefeiturasService);

const PREFEITURA: PrefeituraOut = { id: 1, ibge_code: "3500000", name: "Jeriquara", active: true };

function importacao(overrides: Partial<ImportacaoOut> = {}): ImportacaoOut {
  return {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    status: "falhou",
    display_name: "backup semana 32",
    expected_size_bytes: 1024,
    created_at: "2026-08-25T00:00:00Z",
    last_failure_code: "object_absent",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockedPrefeiturasService.list.mockResolvedValue([PREFEITURA]);
});

describe("ImportacoesPage — renomear, excluir e continuar envio", () => {
  it("exige revisão explícita da prefeitura antes de liberar um novo upload", async () => {
    mockedImportacoesService.list.mockResolvedValue([]);
    mockedImportacoesService.start.mockResolvedValue(importacao({ id: "bbbbbbbb-0000-0000-0000-000000000001" }));
    mockedImportacoesService.startMultipart.mockResolvedValue({
      part_size_bytes: 8,
      total_parts: 1,
      uploaded_parts: [],
      accepted_parts: [],
    });
    mockedImportacoesService.uploadPartInstructions.mockResolvedValue({
      part_number: 1,
      url: "https://r2.example.test/upload",
      method: "PUT",
      headers: {},
      expires_at: "2026-08-25T01:00:00Z",
    });
    mockedImportacoesService.uploadPart.mockResolvedValue('"etag"');
    mockedImportacoesService.completeMultipart.mockResolvedValue(importacao({ status: "recebido" }));
    const user = userEvent.setup();

    render(<ImportacoesPage />);

    await user.click(await screen.findByRole("button", { name: "Nova importação" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Destino do backup")).toBeInTheDocument();
    expect(within(dialog).getByText("Jeriquara")).toBeInTheDocument();
    expect(within(dialog).getByText("3500000")).toBeInTheDocument();

    const enviar = within(dialog).getByRole("button", { name: "Enviar" });
    expect(enviar).toBeDisabled();

    await user.upload(
      within(dialog).getByLabelText("Arquivo do dump"),
      new File(["conteudo"], "backup.dump", { type: "application/octet-stream" }),
    );
    await user.type(within(dialog).getByLabelText("Nome da importação"), "Backup semanal");
    await user.type(within(dialog).getByLabelText("Confirme o código IBGE"), PREFEITURA.ibge_code);
    await user.click(within(dialog).getByRole("checkbox", { name: /confirmo que este backup pertence/i }));

    expect(enviar).toBeEnabled();
    await user.click(enviar);
    await waitFor(() => {
      expect(mockedImportacoesService.start).toHaveBeenCalledWith(PREFEITURA.id, {
        display_name: "Backup semanal",
        expected_size_bytes: 8,
        destination_confirmation_ibge_code: PREFEITURA.ibge_code,
      });
    });
  });

  it("mostra as fases reais sem porcentagem para uma importação em validação", async () => {
    mockedImportacoesService.list.mockResolvedValue([
      importacao({ status: "validando", last_failure_code: null }),
    ]);

    render(<ImportacoesPage />);

    const etapas = await screen.findByRole("region", { name: "Etapas do processamento" });
    expect(within(etapas).getByText("Envio")).toBeInTheDocument();
    expect(within(etapas).getByText("Validação")).toBeInTheDocument();
    expect(within(etapas).getByText("Restauração")).toBeInTheDocument();
    expect(within(etapas).getByText("Extração e publicação")).toBeInTheDocument();
    expect(within(etapas).getByText("Concluída")).toBeInTheDocument();
    expect(within(etapas).getByText("em andamento")).toBeInTheDocument();
    expect(within(etapas).getByText(/em processamento há/i)).toBeInTheDocument();
    expect(within(etapas).getByText(/tela consultada às/i)).toBeInTheDocument();
    expect(within(etapas).queryByText(/%/)).not.toBeInTheDocument();
  });

  it("explica uma falha uma única vez, no status da importação", async () => {
    mockedImportacoesService.list.mockResolvedValue([importacao({ status: "falhou" })]);

    render(<ImportacoesPage />);

    expect(await screen.findByText("O arquivo enviado não foi encontrado no armazenamento.")).toBeInTheDocument();
    expect(screen.queryByText(/processamento interrompido/i)).not.toBeInTheDocument();
  });

  it("permite retomar uma falha sem pedir novo arquivo", async () => {
    const falha = importacao({ last_failure_code: "extracao_transient" });
    mockedImportacoesService.list.mockResolvedValue([falha]);
    mockedImportacoesService.retry.mockResolvedValue(importacao({ status: "staging_restaurado", last_failure_code: null }));
    const user = userEvent.setup();

    render(<ImportacoesPage />);
    await screen.findByText("backup semana 32");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => {
      expect(mockedImportacoesService.retry).toHaveBeenCalledWith(PREFEITURA.id, falha.id);
    });
    expect(mockedImportacoesService.list).toHaveBeenCalledTimes(2);
  });

  it("renomeia uma importação e recarrega a lista", async () => {
    mockedImportacoesService.list.mockResolvedValue([importacao()]);
    mockedImportacoesService.rename.mockResolvedValue(importacao({ display_name: "novo nome" }));
    const user = userEvent.setup();

    render(<ImportacoesPage />);
    await screen.findByText("backup semana 32");

    await user.click(screen.getByRole("button", { name: /renomear backup semana 32/i }));
    const campo = await screen.findByLabelText("Nome");
    await user.clear(campo);
    await user.type(campo, "novo nome");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(mockedImportacoesService.rename).toHaveBeenCalledWith(
        PREFEITURA.id,
        importacao().id,
        "novo nome",
      );
    });
    expect(mockedImportacoesService.list).toHaveBeenCalledTimes(2);
  });

  it("exclui uma importação com falha após confirmação", async () => {
    mockedImportacoesService.list.mockResolvedValue([importacao()]);
    mockedImportacoesService.remove.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ImportacoesPage />);
    await screen.findByText("backup semana 32");

    await user.click(screen.getByRole("button", { name: /excluir backup semana 32/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => {
      expect(mockedImportacoesService.remove).toHaveBeenCalledWith(PREFEITURA.id, importacao().id);
    });
  });

  it("desabilita o botão de excluir para importação concluída", async () => {
    mockedImportacoesService.list.mockResolvedValue([importacao({ status: "concluido", last_failure_code: null })]);

    render(<ImportacoesPage />);
    await screen.findByText("backup semana 32");

    expect(screen.getByRole("button", { name: /excluir backup semana 32/i })).toBeDisabled();
  });

  it("retoma após refresh sem reenviar partes já aceitas e completa com todos os ETags", async () => {
    const travada = importacao({ status: "aguardando_upload", last_failure_code: null, expected_size_bytes: 8 });
    mockedImportacoesService.list.mockResolvedValue([travada]);
    mockedImportacoesService.getMultipart.mockResolvedValue({
      part_size_bytes: 5,
      total_parts: 2,
      uploaded_parts: [1],
      accepted_parts: [{ part_number: 1, etag: '"etag-ja-confirmado"' }],
    });
    mockedImportacoesService.uploadPartInstructions.mockResolvedValue({
      part_number: 1, url: "https://r2.example.test/upload", method: "PUT", headers: {}, expires_at: "2026-08-25T01:00:00Z",
    });
    mockedImportacoesService.uploadPart.mockResolvedValue('"etag-parte-2"');
    mockedImportacoesService.completeMultipart.mockResolvedValue(importacao({ status: "recebido" }));
    const user = userEvent.setup();

    render(<ImportacoesPage />);
    await screen.findByText("backup semana 32");

    await user.click(screen.getByRole("button", { name: "Continuar envio" }));
    expect(await screen.findByText(/retomar o envio/i)).toBeInTheDocument();

    const arquivo = new File(["conteudo"], "backup.dump", { type: "application/octet-stream" });
    await user.upload(screen.getByLabelText("Arquivo do dump"), arquivo);
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => {
      expect(mockedImportacoesService.getMultipart).toHaveBeenCalledWith(
        PREFEITURA.id,
        travada.id,
      );
    });
    expect(mockedImportacoesService.startMultipart).not.toHaveBeenCalled();
    expect(mockedImportacoesService.start).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockedImportacoesService.uploadPartInstructions).toHaveBeenCalledTimes(1);
      expect(mockedImportacoesService.uploadPartInstructions).toHaveBeenCalledWith(
        PREFEITURA.id,
        travada.id,
        2,
      );
      expect(mockedImportacoesService.completeMultipart).toHaveBeenCalledWith(
        PREFEITURA.id,
        travada.id,
        [
          { part_number: 1, etag: '"etag-ja-confirmado"' },
          { part_number: 2, etag: '"etag-parte-2"' },
        ],
      );
    });
  });
});
