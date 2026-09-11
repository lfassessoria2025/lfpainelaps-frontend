import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CampoDivergenciaGestante,
  GestanteAcompanhamentoOut,
  GestanteValidacaoClienteIn,
  GestanteValidacaoClienteOut,
  MotivoDivergenciaGestante,
} from "@/lib/api-types";

const CAMPOS: ReadonlyArray<{ valor: CampoDivergenciaGestante; rotulo: string }> = [
  { valor: "coorte", rotulo: "Presença na planilha" },
  { valor: "identificacao", rotulo: "Identificação/cadastro" },
  { valor: "dum", rotulo: "DUM / início" },
  { valor: "dpp", rotulo: "DPP / fim" },
  { valor: "aborto", rotulo: "Aborto/desfecho" },
  ...(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"] as const).map(
    (valor) => ({ valor, rotulo: `Prática ${valor}` }),
  ),
];

const MOTIVOS: ReadonlyArray<{ valor: MotivoDivergenciaGestante; rotulo: string }> = [
  { valor: "ausente_na_planilha", rotulo: "Gestante não consta na planilha" },
  { valor: "valor_diferente_na_planilha", rotulo: "Valor diferente na planilha" },
  { valor: "data_divergente", rotulo: "DUM, DPP ou desfecho divergente" },
  { valor: "evento_posterior_ao_dump", rotulo: "Evento lançado depois da data do dump" },
  { valor: "pre_natal_sem_encerramento", rotulo: "Pré-natal sem encerramento no e-SUS" },
  { valor: "cadastro_divergente", rotulo: "Cadastro/identificação divergente" },
  { valor: "outro", rotulo: "Outro motivo" },
];

interface ValidacaoPlanilhaDialogProps {
  gestante: GestanteAcompanhamentoOut | null;
  validacao: GestanteValidacaoClienteOut | null;
  open: boolean;
  salvando: boolean;
  erro: string | null;
  onOpenChange: (open: boolean) => void;
  onSalvar: (entrada: GestanteValidacaoClienteIn) => Promise<void>;
}

export function ValidacaoPlanilhaDialog({
  gestante,
  validacao,
  open,
  salvando,
  erro,
  onOpenChange,
  onSalvar,
}: ValidacaoPlanilhaDialogProps) {
  const [campos, setCampos] = useState<CampoDivergenciaGestante[]>([]);
  const [motivo, setMotivo] = useState<MotivoDivergenciaGestante | null>(null);
  const [observacao, setObservacao] = useState("");
  const [tentouSalvar, setTentouSalvar] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCampos(validacao?.status === "divergente" ? validacao.campos_divergentes : []);
    setMotivo(validacao?.status === "divergente" ? validacao.motivo_divergencia : null);
    setObservacao(validacao?.observacao ?? "");
    setTentouSalvar(false);
  }, [open, validacao]);

  function alternarCampo(campo: CampoDivergenciaGestante, selecionado: boolean) {
    setCampos((atuais) =>
      selecionado ? [...new Set([...atuais, campo])] : atuais.filter((item) => item !== campo),
    );
  }

  async function salvar() {
    setTentouSalvar(true);
    if (campos.length === 0 || motivo === null) return;
    await onSalvar({
      status: "divergente",
      campos_divergentes: campos,
      motivo_divergencia: motivo,
      observacao: observacao.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar divergência da planilha</DialogTitle>
          <DialogDescription>
            {gestante
              ? `Informe o que não confere para ${gestante.nome_cidadao}. O cálculo do sistema será preservado.`
              : "Informe os campos e o motivo da divergência."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <FieldSet>
            <FieldLegend>O que está diferente?</FieldLegend>
            <FieldDescription>Marque todos os campos que precisam de conferência.</FieldDescription>
            <div data-slot="checkbox-group" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CAMPOS.map((campo) => (
                <Field key={campo.valor} orientation="horizontal">
                  <Checkbox
                    id={`campo-divergente-${campo.valor}`}
                    checked={campos.includes(campo.valor)}
                    onCheckedChange={(checked) => alternarCampo(campo.valor, checked)}
                    aria-invalid={tentouSalvar && campos.length === 0}
                  />
                  <FieldLabel htmlFor={`campo-divergente-${campo.valor}`}>
                    {campo.rotulo}
                  </FieldLabel>
                </Field>
              ))}
            </div>
            {tentouSalvar && campos.length === 0 ? (
              <FieldError>Selecione ao menos um campo divergente.</FieldError>
            ) : null}
          </FieldSet>

          <Field data-invalid={tentouSalvar && motivo === null}>
            <FieldLabel htmlFor="motivo-divergencia">Motivo principal</FieldLabel>
            <Select
              value={motivo ?? undefined}
              onValueChange={(value) => setMotivo(value as MotivoDivergenciaGestante)}
            >
              <SelectTrigger id="motivo-divergencia" aria-invalid={tentouSalvar && motivo === null}>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MOTIVOS.map((item) => (
                    <SelectItem key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {tentouSalvar && motivo === null ? <FieldError>Selecione um motivo.</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="observacao-divergencia">Observação opcional</FieldLabel>
            <Input
              id="observacao-divergencia"
              value={observacao}
              maxLength={1000}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Ex.: planilha mostra 5 consultas; sistema encontrou 6."
            />
            <FieldDescription>
              Não informe CPF ou CNS. Descreva apenas o necessário para a conferência.
            </FieldDescription>
          </Field>
        </FieldGroup>

        {erro ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Não foi possível salvar</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            Salvar divergência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
