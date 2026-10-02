import { CheckCircle2, CircleAlert, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FechamentoC6Out, IdosoFechamentoC6Out } from "@/lib/api-types";

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Pendencias({ idoso }: { idoso: IdosoFechamentoC6Out }) {
  if (idoso.praticas_pendentes.length === 0) {
    return <span className="text-muted-foreground">Nenhuma</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {idoso.praticas_pendentes.map((pratica) => (
        <Badge key={pratica} variant="outline">{pratica}</Badge>
      ))}
    </div>
  );
}

const CLASSIFICACOES = {
  otimo: "Ótimo",
  bom: "Bom",
  suficiente: "Suficiente",
  regular: "Regular",
} as const;

export function FechamentoC6({ dados }: { dados: FechamentoC6Out }) {
  const resumo = [
    { titulo: "Pessoas avaliadas", valor: dados.resumo.total_idosos, apoio: "no recorte selecionado", icone: Users },
    { titulo: "Cuidado completo", valor: dados.resumo.total_completos, apoio: "com 100 pontos", icone: CheckCircle2 },
    { titulo: "Com pendências", valor: dados.resumo.total_pendentes, apoio: "precisam de acompanhamento", icone: CircleAlert },
    { titulo: "Pontuação", valor: formatarNumero(dados.resumo.pontuacao_indicador), apoio: CLASSIFICACOES[dados.resumo.classificacao], icone: Target },
  ];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>Referência: <strong className="text-foreground">{formatarData(dados.data_referencia)}</strong></p>
        <p>{dados.quadrimestre ?? "Quadrimestre não informado"}{dados.quadrimestre_inicio && dados.quadrimestre_fim ? ` · ${formatarData(dados.quadrimestre_inicio)} a ${formatarData(dados.quadrimestre_fim)}` : ""}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {resumo.map((item) => (
          <Card key={item.titulo} className="gap-2 p-4 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">{item.titulo}</p>
              <item.icone className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <strong className="text-2xl font-semibold tabular-nums">{item.valor}</strong>
            <p className="text-xs text-muted-foreground">{item.apoio}</p>
          </Card>
        ))}
      </div>

      <section aria-labelledby="praticas-c6">
        <h2 id="praticas-c6" className="mb-2 text-sm font-semibold">Cobertura por prática</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {dados.praticas.map((pratica) => (
            <Card key={pratica.pratica} className="gap-3 p-4 shadow-none">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">Prática {pratica.pratica}</p>
                  <p className="text-xs text-muted-foreground">{pratica.titulo}</p>
                </div>
                <Badge variant="secondary">25 pts</Badge>
              </div>
              <strong className="text-xl tabular-nums">{formatarNumero(pratica.percentual_cobertura)}%</strong>
              <p className="text-xs text-muted-foreground">
                {pratica.total_concluidas}/{pratica.total_aplicaveis} concluídas · contribuição {formatarNumero(pratica.contribuicao_pontos)} pts
              </p>
            </Card>
          ))}
        </div>
      </section>

      {dados.itens.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhuma pessoa idosa no fechamento</EmptyTitle>
            <EmptyDescription>Não há registros no recorte selecionado.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Situação nominal</CardTitle>
            <p className="text-xs text-muted-foreground">Pessoas com cuidado completo ou práticas pendentes.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px] text-xs">
                <TableHeader><TableRow><TableHead>Pessoa</TableHead><TableHead>Equipe</TableHead><TableHead>Micro-área</TableHead><TableHead>Status</TableHead><TableHead>Práticas pendentes</TableHead><TableHead className="text-right">Pontuação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dados.itens.map((idoso) => (
                    <TableRow key={idoso.id}>
                      <TableCell><p className="font-medium">{idoso.nome_cidadao}</p><p className="text-[11px] text-muted-foreground">{formatarData(idoso.data_nascimento)}</p></TableCell>
                      <TableCell>{idoso.equipe_nome ?? "Sem equipe"}</TableCell>
                      <TableCell>{idoso.micro_area ?? "Sem micro-área"}</TableCell>
                      <TableCell><Badge variant={idoso.status === "completo" ? "default" : "secondary"}>{idoso.status === "completo" ? "Completo" : "Pendente"}</Badge></TableCell>
                      <TableCell><Pendencias idoso={idoso} /></TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{idoso.pontos_obtidos}/100</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
