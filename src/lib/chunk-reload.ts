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
  "failed to load module script",
  "failed to preload module",
  "module preload",
  "unable to preload css",
  "load failed",
  "loading chunk",
  "chunkloaderror",
  "unexpected token '<'",
];

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

const RELOAD_GUARD_KEY = "chunk-reload-attempted";
const CACHE_BUSTER_PARAM = "__app_reload";
const RELOAD_GUARD_WINDOW_MS = 30_000;

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
    const attemptedAt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY));
    if (Number.isFinite(attemptedAt) && Date.now() - attemptedAt < RELOAD_GUARD_WINDOW_MS) {
      return false;
    }
    // A timestamp expires the guard after a short window. This recovers users
    // who had the old permanent "1" marker from a previous deployment while
    // still preventing an infinite reload loop when a chunk is genuinely gone.
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  // `location.reload()` pode reutilizar um index.html ainda presente no cache
  // de uma aba aberta antes do deploy. A URL única força o CDN/navegador a
  // buscar o HTML atual e evita o loop de chunks antigos.
  const url = new URL(window.location.href);
  url.searchParams.set(CACHE_BUSTER_PARAM, String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

/** Permite uma nova tentativa manual depois que a pessoa clica em recarregar. */
export function clearChunkReloadGuard(): void {
  try {
    window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    // Storage bloqueado não impede o recarregamento manual.
  }
}

/** Recarrega sem reaproveitar o HTML que originou uma falha de renderização. */
export function reloadWithCacheBust(): void {
  const url = new URL(window.location.href);
  url.searchParams.set(CACHE_BUSTER_PARAM, String(Date.now()));
  window.location.replace(url.toString());
}
