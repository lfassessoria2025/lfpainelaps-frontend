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
  /**
   * Envia o arquivo diretamente ao armazenamento (URL pré-assinada), fora da
   * API da aplicação — não usa `http` (origem, headers e credenciais diferem).
   */
  uploadFile: async (instructions: UploadInstructionsOut, file: File) => {
    const response = await fetch(instructions.url, {
      method: instructions.method,
      headers: instructions.headers,
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Falha no upload do arquivo (HTTP ${response.status}).`);
    }
  },
};
