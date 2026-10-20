import { CheckCircle2, CircleAlert, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FechamentoC5Out, PessoaFechamentoC5Out } from "@/lib/api-types";

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Pendencias({ pessoa }: { pessoa: PessoaFechamentoC5Out }) {
  if (pessoa.praticas_pendentes.length === 0) {
    return <span className="text-muted-foreground">Nenhuma</span>;
  }
  return <div className="flex flex-wrap gap-1">{pessoa.praticas_pendentes.map((pratica) => <Badge key={pratica} variant="outline">{pratica}</Badge>)}</div>;
}

const CLASSIFICACOES = {
  otimo: "Ótimo",
  bom: "Bom",
  suficiente: "Suficiente",
  regular: "Regular",
} as const;

export function FechamentoC5({ dados, modo = "resumo" }: { dados: FechamentoC5Out; modo?: "resumo" | "completas" }) {
  const itens = modo === "completas"
    ? dados.itens.filter((pessoa) => pessoa.status === "completa")
    : dados.itens.filter((pessoa) => pessoa.status === "pendente");
  const resumo = [
    { titulo: "Pessoas avaliadas", valor: dados.resumo.total_pessoas, apoio: "no recorte selecionado", icone: Users },
    { titulo: "Cuidado completo", valor: dados.resumo.total_completas, apoio: "com 100 pontos", icone: CheckCircle2 },
    { titulo: "Com pendências", valor: dados.resumo.total_pendentes, apoio: "precisam de acompanhamento", icone: CircleAlert },
    { titulo: "Pontuação", valor: formatarNumero(dados.resumo.pontuacao_indicador), apoio: CLASSIFICACOES[dados.resumo.classificacao], icone: Target },
  ];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{modo === "completas" ? "Pessoas com hipertensão e cuidado completo" : "Fechamento do cuidado da pessoa com hipertensão"}</p>
        <p>Referência: <strong className="text-foreground">{formatarData(dados.data_referencia)}</strong></p>
        <p>{dados.quadrimestre ?? "Quadrimestre não informado"}{dados.quadrimestre_inicio && dados.quadrimestre_fim ? ` · ${formatarData(dados.quadrimestre_inicio)} a ${formatarData(dados.quadrimestre_fim)}` : ""}</p>
      </div>
      {modo === "resumo" ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{resumo.map((item) => <Card key={item.titulo} className="gap-2 shadow-none"><CardHeader className="flex-row items-center justify-between gap-3 pb-0"><CardTitle className="text-xs font-medium text-muted-foreground">{item.titulo}</CardTitle><item.icone aria-hidden className="text-muted-foreground" /></CardHeader><CardContent><strong className="text-2xl font-semibold tabular-nums">{item.valor}</strong><p className="text-xs text-muted-foreground">{item.apoio}</p></CardContent></Card>)}</div> : null}
      {modo === "resumo" ? <section aria-labelledby="praticas-c5">
        <h2 id="praticas-c5" className="mb-2 text-sm font-semibold">Cobertura por prática</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{dados.praticas.map((pratica) => <Card key={pratica.pratica} className="gap-3 shadow-none"><CardHeader className="flex-row items-start justify-between gap-2 pb-0"><div><CardTitle className="text-xs">Prática {pratica.pratica}</CardTitle><p className="text-xs text-muted-foreground">{pratica.titulo}</p></div><Badge variant="secondary">{pratica.peso} pts</Badge></CardHeader><CardContent><strong className="text-xl tabular-nums">{formatarNumero(pratica.percentual_cobertura)}%</strong><p className="text-xs text-muted-foreground">{pratica.total_concluidas}/{pratica.total_aplicaveis} concluídas · contribuição {formatarNumero(pratica.contribuicao_pontos)} pts</p></CardContent></Card>)}</div>
      </section> : null}
      {itens.length === 0 ? <Empty><EmptyHeader><EmptyTitle>{modo === "completas" ? "Nenhuma pessoa com hipertensão e cuidado completo" : "Nenhuma pendência de cuidado"}</EmptyTitle><EmptyDescription>{modo === "completas" ? "Nenhuma pessoa atingiu todas as práticas no quadrimestre selecionado." : "Todas as pessoas com hipertensão do recorte estão completas ou não há registros."}</EmptyDescription></EmptyHeader></Empty> : <Card className="gap-0 overflow-hidden py-0 shadow-none"><CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm">{modo === "completas" ? "Pessoas com hipertensão e cuidado completo" : "Pendências do cuidado"}</CardTitle><p className="text-xs text-muted-foreground">{modo === "completas" ? "Pessoas sem práticas pendentes no quadrimestre." : "Pessoas com práticas que ainda precisam de acompanhamento."}</p></CardHeader><CardContent className="p-0"><Table className="min-w-[760px] text-xs"><TableHeader><TableRow><TableHead>Pessoa</TableHead><TableHead>Equipe</TableHead><TableHead>Micro-área</TableHead><TableHead>Status</TableHead><TableHead>Práticas pendentes</TableHead><TableHead className="text-right">Pontuação</TableHead></TableRow></TableHeader><TableBody>{itens.map((pessoa) => <TableRow key={pessoa.id} className="[content-visibility:auto]"><TableCell><p className="font-medium">{pessoa.nome_cidadao}</p><p className="text-[11px] text-muted-foreground">{formatarData(pessoa.data_nascimento)}</p></TableCell><TableCell>{pessoa.equipe_nome ?? "Sem equipe"}</TableCell><TableCell>{pessoa.micro_area ?? "Sem micro-área"}</TableCell><TableCell><Badge variant={pessoa.status === "completa" ? "default" : "secondary"}>{pessoa.status === "completa" ? "Completa" : "Pendente"}</Badge></TableCell><TableCell><Pendencias pessoa={pessoa} /></TableCell><TableCell className="text-right font-medium tabular-nums">{pessoa.pontos_obtidos}/100</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
    </div>
  );
}
