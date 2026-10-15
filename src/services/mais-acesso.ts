import type { FechamentoMaisAcessoC1Out, MaisAcessoC1Out } from "@/lib/api-types";
import { http } from "@/lib/http";

export const maisAcessoService = {
  list: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<MaisAcessoC1Out[]>(`/prefeituras/${prefeituraId}/indicadores/mais-acesso-c1`, signal),
  fechamento: (prefeituraId: number, signal?: AbortSignal) =>
    http.get<FechamentoMaisAcessoC1Out>(
      `/prefeituras/${prefeituraId}/indicadores/mais-acesso-c1/fechamento`,
      signal,
    ),
  exportar: (prefeituraId: number, signal?: AbortSignal) =>
    http.getBlob(`/prefeituras/${prefeituraId}/indicadores/mais-acesso-c1/exportar`, signal),
};
