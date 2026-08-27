import { CheckIcon, CircleAlertIcon, Clock3Icon } from "lucide-react";
import type { ImportacaoStatus } from "@/lib/api-types";
import { cn } from "@/lib/utils";

type EtapaEstado = "concluida" | "atual" | "pendente";

type Etapa = {
  id: "envio" | "validacao" | "restauracao" | "extracao" | "conclusao";
  label: string;
};

const ETAPAS: readonly Etapa[] = [
  { id: "envio", label: "Envio" },
  { id: "validacao", label: "Validação" },
  { id: "restauracao", label: "Restauração" },
  { id: "extracao", label: "Extração e publicação" },
  { id: "conclusao", label: "Concluída" },
];

const ETAPA_ATUAL_POR_STATUS: Partial<Record<ImportacaoStatus, Etapa["id"]>> = {
  aguardando_upload: "envio",
  recebido: "validacao",
  validando: "validacao",
  pronto_para_restaurar: "restauracao",
  restaurando: "restauracao",
  staging_preflight_validado: "restauracao",
  validando_arquivo: "restauracao",
  arquivo_validado: "restauracao",
  restaurando_arquivo: "restauracao",
  staging_restaurado: "extracao",
  extraindo: "extracao",
  concluido: "conclusao",
};

function estadoDaEtapa(status: ImportacaoStatus, etapa: Etapa["id"]): EtapaEstado {
  const etapaAtual = ETAPA_ATUAL_POR_STATUS[status];
  if (!etapaAtual) return "pendente";

  const indiceEtapa = ETAPAS.findIndex((item) => item.id === etapa);
  const indiceAtual = ETAPAS.findIndex((item) => item.id === etapaAtual);
  if (indiceEtapa < indiceAtual) return "concluida";
  if (indiceEtapa === indiceAtual && status === "concluido") return "concluida";
  if (indiceEtapa === indiceAtual) return "atual";
  return "pendente";
}

function rotuloDoEstado(estado: EtapaEstado): string {
  if (estado === "concluida") return "concluída";
  if (estado === "atual") return "em andamento";
  return "aguardando";
}

export function ImportProcessingTimeline({
  status,
  updatedAt,
}: {
  status: ImportacaoStatus;
  updatedAt: Date | null;
}) {
  const interrompida = status === "falhou" || status === "expirado";

  return (
    <section aria-label="Etapas do processamento" className="flex flex-col gap-2">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-0">
        {ETAPAS.map((etapa, indice) => {
          const estado = estadoDaEtapa(status, etapa.id);
          const atual = estado === "atual" && !interrompida;
          return (
            <li
              key={etapa.id}
              aria-current={atual ? "step" : undefined}
              className="relative flex min-w-0 items-center gap-2 sm:flex-col sm:items-start sm:gap-1"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  estado === "concluida" && "border-primary bg-primary text-primary-foreground",
                  atual && "border-primary bg-primary/10 text-primary",
                  estado === "pendente" && "border-border bg-muted text-muted-foreground",
                )}
              >
                {estado === "concluida" ? <CheckIcon className="size-3.5" /> : <Clock3Icon className="size-3.5" />}
              </span>
              <span className="min-w-0 text-xs leading-tight">
                <span className="block font-medium">{etapa.label}</span>
                <span className="text-muted-foreground">{rotuloDoEstado(estado)}</span>
              </span>
              {indice < ETAPAS.length - 1 ? (
                <span aria-hidden="true" className="hidden h-px flex-1 bg-border sm:absolute sm:top-3 sm:left-7 sm:block sm:w-[calc(100%-1.75rem)]" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {interrompida ? (
        <p className="flex items-center gap-1 text-xs text-destructive" role="status">
          <CircleAlertIcon className="size-3.5" />
          Processamento interrompido; consulte a mensagem de falha abaixo.
        </p>
      ) : null}

      {updatedAt ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Informações atualizadas às {updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
        </p>
      ) : null}
    </section>
  );
}
