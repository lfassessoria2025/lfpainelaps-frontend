import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsibilityTermDocument } from "@/components/responsibility-terms/responsibility-term-document";
import type { AcceptedResponsibilityTermCopyOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { responsibilityTermsService } from "@/services/responsibility-terms";

export function AcceptedTermCopyCard() {
  const [copy, setCopy] = useState<AcceptedResponsibilityTermCopyOut | null>(null);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCopy = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const current = await responsibilityTermsService.current(signal);
      if (!current.accepted) {
        setNeedsAcceptance(true);
        setCopy(null);
        return;
      }
      const accepted = await responsibilityTermsService.acceptedCopy(current.id, signal);
      setCopy(accepted);
      setNeedsAcceptance(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCopy(null);
      setError(err instanceof ApiError ? err.detail : "Não foi possível carregar sua cópia. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCopy(controller.signal);
    return () => controller.abort();
  }, [loadCopy]);

  if (isLoading) {
    return <Card><CardHeader><CardTitle>Termo de responsabilidade e sigilo</CardTitle></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }
  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Termo de responsabilidade e sigilo</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Cópia indisponível</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" onClick={() => void loadCopy()}>Tentar novamente</Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  if (needsAcceptance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Termo de responsabilidade e sigilo</CardTitle>
          <CardDescription>Há uma versão vigente aguardando sua confirmação.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/termo-responsabilidade?returnTo=%2Fperfil" />}>Ler termo vigente</Button>
        </CardContent>
      </Card>
    );
  }
  return copy ? <ResponsibilityTermDocument term={copy} acceptedAt={copy.accepted_at} /> : null;
}
