import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResponsibilityTermOut } from "@/lib/api-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}

interface ResponsibilityTermDocumentProps {
  term: Omit<ResponsibilityTermOut, "accepted">;
  acceptedAt?: string | null;
}

export function ResponsibilityTermDocument({ term, acceptedAt }: ResponsibilityTermDocumentProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Versão {term.version}</Badge>
          <span className="text-xs text-muted-foreground">
            Vigente desde {formatDate(term.effective_at)}
          </span>
        </div>
        <CardTitle>{term.title}</CardTitle>
        <CardDescription>
          {acceptedAt ? `Aceito em ${formatDate(acceptedAt)}.` : "Leia integralmente antes de confirmar."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border bg-muted/20 p-4" tabIndex={0}>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{term.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
