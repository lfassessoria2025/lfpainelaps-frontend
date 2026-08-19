import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import { ResponsibilityTermDocument } from "@/components/responsibility-terms/responsibility-term-document";
import type { ResponsibilityTermOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { responsibilityTermsService } from "@/services/responsibility-terms";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/termo-responsabilidade")) {
    return "/";
  }
  return value;
}

export function ResponsibilityTermPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [term, setTerm] = useState<ResponsibilityTermOut | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTerm = useCallback(async (signal?: AbortSignal, versionChanged = false) => {
    setIsLoading(true);
    setAcknowledged(false);
    try {
      const current = await responsibilityTermsService.current(signal);
      setTerm(current);
      setError(versionChanged ? "O termo vigente mudou. Leia a nova versão antes de confirmar." : null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setTerm(null);
      setError(err instanceof ApiError ? err.detail : "Não foi possível carregar o termo. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTerm(controller.signal);
    return () => controller.abort();
  }, [loadTerm]);

  async function handleAccept() {
    if (!term || !acknowledged) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await responsibilityTermsService.acceptCurrent({
        term_id: term.id,
        content_sha256: term.content_sha256,
        acknowledged: true,
      });
      navigate(returnTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await loadTerm(undefined, true);
      } else {
        setError(err instanceof ApiError ? err.detail : "Não foi possível registrar o aceite. Verifique sua conexão.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Termo de responsabilidade e sigilo"
        description="A leitura e a confirmação são necessárias para acessar dados de saúde."
      />

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-label="Carregando termo">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : term ? (
        <>
          {error ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <ResponsibilityTermDocument term={term} />
          {term.accepted ? (
            <Alert>
              <AlertTitle>Termo já aceito</AlertTitle>
              <AlertDescription>Esta versão já foi confirmada por você.</AlertDescription>
            </Alert>
          ) : (
            <Field data-invalid={Boolean(error)}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  aria-describedby="term-acknowledgement-description"
                />
                <span id="term-acknowledgement-description">
                  Declaro que li e assumo a responsabilidade de manter o sigilo e usar os dados somente para as finalidades autorizadas.
                </span>
              </label>
              <FieldDescription>Esta opção nunca é marcada automaticamente.</FieldDescription>
            </Field>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {error ? <Button variant="outline" onClick={() => void loadTerm()} disabled={isSubmitting}>Recarregar termo</Button> : null}
            <Button
              onClick={term.accepted ? () => navigate(returnTo, { replace: true }) : handleAccept}
              disabled={isSubmitting || (!term.accepted && !acknowledged)}
            >
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {term.accepted ? "Continuar" : "Confirmar responsabilidade e continuar"}
            </Button>
          </div>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Termo indisponível</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" onClick={() => void loadTerm()}>Tentar novamente</Button>
        </Alert>
      )}
    </div>
  );
}
