import { http } from "@/lib/http";
import type {
  ImportacaoCreate,
  ImportacaoOut,
  MultipartCompletePart,
  MultipartPartOut,
  MultipartSessionOut,
  UploadInstructionsOut,
} from "@/lib/api-types";

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
  startMultipart: (prefeituraId: number, publicId: string) =>
    http.post<MultipartSessionOut>(`/prefeituras/${prefeituraId}/imports/${publicId}/multipart`),
  getMultipart: (prefeituraId: number, publicId: string) =>
    http.get<MultipartSessionOut>(`/prefeituras/${prefeituraId}/imports/${publicId}/multipart`),
  uploadPartInstructions: (prefeituraId: number, publicId: string, partNumber: number) =>
    http.post<MultipartPartOut>(
      `/prefeituras/${prefeituraId}/imports/${publicId}/multipart/parts/${partNumber}`,
    ),
  completeMultipart: (prefeituraId: number, publicId: string, parts: MultipartCompletePart[]) =>
    http.post<ImportacaoOut>(`/prefeituras/${prefeituraId}/imports/${publicId}/multipart/complete`, { parts }),
  abortMultipart: (prefeituraId: number, publicId: string) =>
    http.delete<void>(`/prefeituras/${prefeituraId}/imports/${publicId}/multipart`),
  rename: (prefeituraId: number, publicId: string, displayName: string) =>
    http.patch<ImportacaoOut>(`/prefeituras/${prefeituraId}/imports/${publicId}`, {
      display_name: displayName,
    }),
  retry: (prefeituraId: number, publicId: string) =>
    http.post<ImportacaoOut>(`/prefeituras/${prefeituraId}/imports/${publicId}/retry`),
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
        // A resposta do armazenamento pode carregar detalhes de infraestrutura
        // (bucket, chave ou assinatura). Ela não é uma mensagem segura para a
        // pessoa usuária; o código HTTP basta para suporte sem vazar a URL
        // pré-assinada ou outros metadados internos.
        reject(new Error(`Falha no upload do arquivo (HTTP ${xhr.status}). Verifique a conexão e tente continuar o envio.`));
      };
      xhr.onerror = () => reject(new Error("Falha de rede durante o envio do arquivo."));
      xhr.onabort = () => reject(new Error("Envio cancelado."));
      xhr.send(file);
    }),
  /** Envia uma parte e devolve o ETag que o R2 aceitou. A URL é usada só nesta
   * requisição e não é registrada em storage/local state. */
  uploadPart: (
    instructions: UploadInstructionsOut,
    blob: Blob,
    onProgress?: (bytes: number) => void,
  ) =>
    new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(instructions.method, instructions.url);
      for (const [nome, valor] of Object.entries(instructions.headers)) xhr.setRequestHeader(nome, valor);
      xhr.upload.onprogress = (evento) => {
        if (evento.lengthComputable) onProgress?.(evento.loaded);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader("ETag");
          if (etag) {
            resolve(etag);
            return;
          }
          reject(new Error("O armazenamento não confirmou a parte enviada. Tente novamente."));
          return;
        }
        // Não propagar o corpo bruto do R2 para a interface. A sessão no
        // servidor registra as partes confirmadas, portanto a ação segura é
        // tentar continuar o envio sem revelar detalhes técnicos.
        reject(new Error(`Falha no upload da parte (HTTP ${xhr.status}). Verifique a conexão e tente continuar o envio.`));
      };
      xhr.onerror = () => reject(new Error("Falha de rede durante o envio."));
      xhr.onabort = () => reject(new Error("Envio cancelado."));
      xhr.send(blob);
    }),
};
