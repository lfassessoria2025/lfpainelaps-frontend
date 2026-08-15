import { http } from "@/lib/http";
import type { IndicadoresCatalogoOut } from "@/lib/api-types";

export const indicadoresService = {
  catalogo: (signal?: AbortSignal) =>
    http.get<IndicadoresCatalogoOut>("/indicadores", signal),
};
