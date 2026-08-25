import { http } from "@/lib/http";
import type { ImportacaoCreate, ImportacaoOut, UploadInstructionsOut } from "@/lib/api-types";

export const importacoesService = {
  list: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<ImportacaoOut[]>(`/prefeituras/${prefeituraId}/imports`, signal),
  get: (prefeituraId: number, publicId: string, signal?: AbortSignal) =>
    http.get<ImportacaoOut>(`/prefeituras/${prefeituraId}/imports/${publicId}`, signal),
  start: (prefeituraId: number, payload: ImportacaoCreate) =>
    http.post<ImportacaoOut>(`/prefeituras/${prefeituraId}/imports`, payload),
  uploadInstructions: (prefeituraId: number, publicId: string) =>
    http.post<UploadInstructionsOut>(
      `/prefeituras/${prefeituraId}/imports/${publicId}/upload-instructions`,
    ),
  confirmUpload: (prefeituraId: number, publicId: string) =>
    http.post<ImportacaoOut>(
      `/prefeituras/${prefeituraId}/imports/${publicId}/upload-confirmation`,
    ),
  rename: (prefeituraId: number, publicId: string, displayName: string) =>
    http.patch<ImportacaoOut>(`/prefeituras/${prefeituraId}/imports/${publicId}`, {
      display_name: displayName,
    }),
  remove: (prefeituraId: number, publicId: string) =>
    http.delete<void>(`/prefeituras/${prefeituraId}/imports/${publicId}`),
  /**
   * Envia o arquivo diretamente ao armazenamento (URL pré-assinada), fora da
   * API da aplicação — não usa `http` (origem, headers e credenciais diferem).
   *
   * XMLHttpRequest, não `fetch`: é a única API que expõe progresso real de
   * envio (`upload.onprogress`) para alimentar a barra da tela, e também
   * devolve status/corpo da resposta em caso de falha — sem isso, qualquer
   * rejeição do R2 (CORS, assinatura expirada, etc.) virava a mesma mensagem
   * genérica "não foi possível enviar", impossível de diagnosticar a partir
   * do relato da cliente.
   */
  uploadFile: (
    instructions: UploadInstructionsOut,
    file: File,
    onProgress?: (fracao: number) => void,
  ) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(instructions.method, instructions.url);
      for (const [nome, valor] of Object.entries(instructions.headers)) {
        xhr.setRequestHeader(nome, valor);
      }
      xhr.upload.onprogress = (evento) => {
        if (evento.lengthComputable && onProgress) onProgress(evento.loaded / evento.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        const corpo = xhr.responseText ? `: ${xhr.responseText.slice(0, 300)}` : "";
        reject(new Error(`Falha no upload do arquivo (HTTP ${xhr.status})${corpo}`));
      };
      xhr.onerror = () => reject(new Error("Falha de rede durante o envio do arquivo."));
      xhr.onabort = () => reject(new Error("Envio cancelado."));
      xhr.send(file);
    }),
};
