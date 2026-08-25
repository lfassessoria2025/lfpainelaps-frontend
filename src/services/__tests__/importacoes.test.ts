import { afterEach, describe, expect, it, vi } from "vitest";
import { importacoesService } from "@/services/importacoes";
import type { UploadInstructionsOut } from "@/lib/api-types";

const INSTRUCOES: UploadInstructionsOut = {
  url: "https://r2.example.test/upload",
  method: "PUT",
  headers: { "Content-Type": "application/octet-stream", "If-None-Match": "*" },
  expires_at: "2026-08-25T01:00:00Z",
};

class XhrFalso {
  static ultima: XhrFalso | null = null;

  status = 0;
  responseText = "";
  upload = { onprogress: null as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private headers: Record<string, string> = {};
  private enviado = false;

  open(_method: string, _url: string) {
    XhrFalso.ultima = this;
  }

  setRequestHeader(nome: string, valor: string) {
    this.headers[nome] = valor;
  }

  send() {
    this.enviado = true;
  }

  get foiEnviado() {
    return this.enviado;
  }

  get headersEnviados() {
    return this.headers;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  XhrFalso.ultima = null;
});

describe("importacoesService.uploadFile", () => {
  it("reporta progresso real durante o envio e resolve em 2xx", async () => {
    vi.stubGlobal("XMLHttpRequest", XhrFalso as unknown as typeof XMLHttpRequest);
    const progresso: number[] = [];
    const arquivo = new File(["x".repeat(1000)], "dump.backup");

    const promessa = importacoesService.uploadFile(INSTRUCOES, arquivo, (fracao) =>
      progresso.push(fracao),
    );

    const xhr = XhrFalso.ultima!;
    expect(xhr.headersEnviados).toEqual(INSTRUCOES.headers);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 500, total: 1000 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1000, total: 1000 });
    xhr.status = 200;
    xhr.onload?.();

    await expect(promessa).resolves.toBeUndefined();
    expect(progresso).toEqual([0.5, 1]);
  });

  it("rejeita com o status e o corpo da resposta em falha (não mensagem genérica)", async () => {
    vi.stubGlobal("XMLHttpRequest", XhrFalso as unknown as typeof XMLHttpRequest);
    const arquivo = new File(["x"], "dump.backup");

    const promessa = importacoesService.uploadFile(INSTRUCOES, arquivo);

    const xhr = XhrFalso.ultima!;
    xhr.status = 403;
    xhr.responseText = "<Error><Code>AccessDenied</Code></Error>";
    xhr.onload?.();

    await expect(promessa).rejects.toThrow(/HTTP 403.*AccessDenied/s);
  });

  it("rejeita com mensagem de rede quando a requisição falha antes de responder", async () => {
    vi.stubGlobal("XMLHttpRequest", XhrFalso as unknown as typeof XMLHttpRequest);
    const arquivo = new File(["x"], "dump.backup");

    const promessa = importacoesService.uploadFile(INSTRUCOES, arquivo);
    XhrFalso.ultima!.onerror?.();

    await expect(promessa).rejects.toThrow(/falha de rede/i);
  });
});
