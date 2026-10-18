import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { clearChunkReloadGuard, isChunkLoadError, reloadOnceForChunkError } from "@/lib/chunk-reload";

interface Props {
  children: ReactNode;
}

type Status = "ok" | "reloading" | "error";

interface State {
  status: Status;
}

/**
 * Único jeito de capturar erro de render em React (inclusive falha de chunk
 * lazy) é um error boundary de classe — não existe equivalente em hook.
 * Sem isto, um import dinâmico falho (ex.: deploy novo invalidou o hash do
 * chunk que o index.html em cache do navegador ainda referencia) derruba a
 * árvore inteira em silêncio, sobrando só o fundo da página (FLO-76).
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { status: "ok" };
  private reloadFallbackTimer: number | undefined;

  static getDerivedStateFromError(error: Error): State {
    // Chunk desatualizado: fica em "reloading" e nunca tenta renderizar os
    // filhos quebrados de novo. `reloadOnceForChunkError` é idempotente (só
    // dispara o reload de fato na primeira chamada da sessão) — mas o status
    // some "reloading" independente disso, porque React pode invocar este
    // método mais de uma vez para o mesmo erro (double-render de diagnóstico
    // em dev) e o reload real vai navegar pra fora de qualquer forma.
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
      return { status: "reloading" };
    }
    return { status: "error" };
  }

  componentDidMount() {
    // Se o navegador bloquear o reload automático, não deixe a pessoa presa
    // em um spinner infinito: ofereça o fallback manual após alguns segundos.
    if (this.state.status === "reloading") {
      this.reloadFallbackTimer = window.setTimeout(() => {
        this.setState({ status: "error" });
      }, 5_000);
    }
  }

  componentWillUnmount() {
    if (this.reloadFallbackTimer !== undefined) {
      window.clearTimeout(this.reloadFallbackTimer);
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      console.warn("Falha ao carregar recurso da rota; a página será atualizada:", error.message);
      return;
    }
    console.error("Falha ao renderizar a rota:", error, info.componentStack);
  }

  private handleRetry = () => {
    clearChunkReloadGuard();
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (this.state.status === "reloading") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Spinner className="size-8" />
        </div>
      );
    }

    if (this.state.status === "error") {
      return (
        <div className="flex h-screen items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Não foi possível carregar esta tela</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>
                Isso costuma acontecer logo após uma atualização do sistema. Recarregar a página
                resolve na maioria dos casos.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleRetry}>Recarregar</Button>
                <Button variant="outline" onClick={this.handleGoHome}>Voltar ao painel</Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
