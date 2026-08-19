/**
 * Falha de import dinâmico (React.lazy) após um deploy: o navegador ainda tem
 * o index.html antigo em cache, referenciando um hash de chunk que o CDN não
 * serve mais. Chrome/Firefox/Safari usam mensagens diferentes para isso, sem
 * um tipo de erro dedicado — checar por substring é a forma padrão de
 * detectar esse caso específico (ex.: estratégia do próprio Vite/Vitest).
 */
const CHUNK_LOAD_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
];

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

const RELOAD_GUARD_KEY = "chunk-reload-attempted";

/**
 * Recarrega a página uma única vez por sessão de aba. Sem o guard, um chunk
 * genuinamente quebrado (não só cache velho) causaria loop infinito de reload.
 *
 * `sessionStorage` pode lançar (modos de navegação privada mais restritos,
 * extensões que bloqueiam storage, políticas corporativas) — isto roda dentro
 * de `getDerivedStateFromError`, que o React não envolve em try/catch, então
 * uma exceção aqui escaparia do próprio Error Boundary. Falha de storage vira
 * "não recarregar automaticamente" (degrada para o fallback manual) em vez de
 * arriscar um crash pior que o original.
 */
export function reloadOnceForChunkError(): boolean {
  try {
    if (window.sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
