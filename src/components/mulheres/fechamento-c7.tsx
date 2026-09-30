import { CheckCircle2, CircleAlert, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FechamentoC7Out, MulherFechamentoC7Out } from "@/lib/api-types";

interface FechamentoC7Props {
  dados: FechamentoC7Out | null;
  carregando: boolean;
  erro: string | null;
}

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Pontuacao({ mulher }: { mulher: MulherFechamentoC7Out }) {
  return (
    <span className="font-medium tabular-nums">
      {formatarNumero(mulher.pontos_obtidos)}/{formatarNumero(mulher.pontos_aplicaveis)}
    </span>
  );
}

function Pendencias({ mulher }: { mulher: MulherFechamentoC7Out }) {
  if (mulher.praticas_pendentes.length === 0) {
    return <span className="text-muted-foreground">Nenhuma</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {mulher.praticas_pendentes.map((pratica) => (
        <Badge key={pratica} variant="outline">{pratica}</Badge>
      ))}
    </div>
  );
}

export function FechamentoC7({ dados, carregando, erro }: FechamentoC7Props) {
  if (carregando) {
    return (
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => <Skeleton key={indice} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (erro) return <p role="alert" className="text-sm text-destructive">{erro}</p>;
  if (!dados) return null;

  const resumo = [
    { titulo: "Mulheres avaliadas", valor: dados.resumo.total_mulheres, apoio: "no recorte selecionado", icone: Users },
    { titulo: "Cuidado completo", valor: dados.resumo.total_completas, apoio: "sem práticas pendentes", icone: CheckCircle2 },
    { titulo: "Com pendências", valor: dados.resumo.total_pendentes, apoio: "precisam de acompanhamento", icone: CircleAlert },
    { titulo: "Pontuação do indicador", valor: formatarNumero(dados.resumo.pontuacao_indicador), apoio: "soma ponderada das práticas", icone: Target },
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

      <section aria-labelledby="praticas-c7">
        <h2 id="praticas-c7" className="mb-2 text-sm font-semibold">Cobertura por prática</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {dados.praticas.map((pratica) => (
            <Card key={pratica.pratica} className="gap-3 p-4 shadow-none">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">Prática {pratica.pratica}</p>
                  <p className="text-xs text-muted-foreground">{pratica.titulo}</p>
                </div>
                <Badge variant="secondary">Peso {formatarNumero(pratica.peso)}</Badge>
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
            <EmptyTitle>Nenhuma mulher no fechamento</EmptyTitle>
            <EmptyDescription>Não há registros para o recorte de equipe e micro-área selecionado.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Situação nominal</CardTitle>
            <p className="text-xs text-muted-foreground">Mulheres completas e pendentes no período.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-2 p-3 md:hidden">
              {dados.itens.map((mulher) => (
                <div key={mulher.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{mulher.nome_cidadao}</p>
                      <p className="text-xs text-muted-foreground">{mulher.equipe_nome ?? "Sem equipe"} · {formatarData(mulher.data_nascimento)}</p>
                    </div>
                    <Badge variant={mulher.status === "completa" ? "default" : "secondary"}>{mulher.status === "completa" ? "Completa" : "Pendente"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <Pendencias mulher={mulher} />
                    <Pontuacao mulher={mulher} />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[760px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mulher</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Micro-área</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Práticas pendentes</TableHead>
                    <TableHead className="text-right">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.itens.map((mulher) => (
                    <TableRow key={mulher.id}>
                      <TableCell>
                        <p className="font-medium">{mulher.nome_cidadao}</p>
                        <p className="text-[11px] text-muted-foreground">{formatarData(mulher.data_nascimento)}</p>
                      </TableCell>
                      <TableCell>{mulher.equipe_nome ?? "Sem equipe"}</TableCell>
                      <TableCell>{mulher.micro_area ?? "Sem micro-área"}</TableCell>
                      <TableCell><Badge variant={mulher.status === "completa" ? "default" : "secondary"}>{mulher.status === "completa" ? "Completa" : "Pendente"}</Badge></TableCell>
                      <TableCell><Pendencias mulher={mulher} /></TableCell>
                      <TableCell className="text-right"><Pontuacao mulher={mulher} /></TableCell>
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
