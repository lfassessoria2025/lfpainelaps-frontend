import type { MultipartCompletePart } from "@/lib/api-types";

const STORAGE_PREFIX = "aps.multipart-upload.v1:";

/**
 * Estado mínimo para sobreviver a um refresh. Não inclui arquivo, conteúdo do
 * dump, URLs pré-assinadas ou qualquer segredo. Os ETags são identificadores
 * técnicos exigidos pelo endpoint de complete e são validados novamente pelo
 * backend/R2 antes de o objeto ser aceito.
 */
export interface MultipartUploadState {
  prefeituraId: number;
  importId: string;
  fileName: string;
  fileSize: number;
  parts: MultipartCompletePart[];
}

function key(prefeituraId: number, importId: string) {
  return `${STORAGE_PREFIX}${prefeituraId}:${importId}`;
}

export function loadMultipartUploadState(
  prefeituraId: number,
  importId: string,
): MultipartUploadState | null {
  try {
    const raw = window.localStorage.getItem(key(prefeituraId, importId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<MultipartUploadState>;
    const fileSize = value.fileSize;
    if (
      value.prefeituraId !== prefeituraId ||
      value.importId !== importId ||
      typeof value.fileName !== "string" ||
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize < 0 ||
      !Array.isArray(value.parts)
    ) {
      return null;
    }
    const parts = value.parts.filter(
      (part): part is MultipartCompletePart =>
        typeof part?.part_number === "number" &&
        Number.isSafeInteger(part.part_number) &&
        part.part_number > 0 &&
        typeof part.etag === "string" &&
        part.etag.length > 0,
    );
    return { prefeituraId, importId, fileName: value.fileName, fileSize, parts };
  } catch {
    return null;
  }
}

export function saveMultipartUploadState(state: MultipartUploadState) {
  try {
    window.localStorage.setItem(key(state.prefeituraId, state.importId), JSON.stringify(state));
  } catch {
    // localStorage pode estar indisponível. O backend ainda permite retomar
    // partes já confirmadas, somente a conclusão após refresh exigirá reenvio.
  }
}

export function clearMultipartUploadState(prefeituraId: number, importId: string) {
  try {
    window.localStorage.removeItem(key(prefeituraId, importId));
  } catch {
    // Sem estado local para limpar.
  }
}
