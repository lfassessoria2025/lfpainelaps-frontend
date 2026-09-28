import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, History, Target } from "lucide-react";
import { IndicatorPagination } from "@/components/indicators/indicator-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import type {
  CriancaFechamentoC2Out,
  FechamentoC2Out,
  PraticaFechamentoC2Out,
} from "@/lib/api-types";
import { cn } from "@/lib/utils";

const ITENS_POR_PAGINA = 10;

function formatarData(valor: string | null): string {
  return valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function formatarMes(anoMes: string): string {
  const [ano, mes] = anoMes.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

const praticaClass: Record<PraticaFechamentoC2Out["status"], string> = {
  concluida: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  recuperavel: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  avaliar: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  prazo_encerrado: "border-border bg-muted text-muted-foreground",
};

function Praticas({ praticas }: { praticas: PraticaFechamentoC2Out[] }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Situação das práticas C2">
      {praticas.map((pratica) => (
        <span
          key={pratica.pratica}
          title={`${pratica.titulo}: ${pratica.orientacao}`}
          className={cn(
            "inline-flex min-w-8 justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
            praticaClass[pratica.status],
          )}
        >
          {pratica.pratica} {pratica.valor}/{pratica.meta}
        </span>
      ))}
    </div>
  );
}

function proximaAcao(crianca: CriancaFechamentoC2Out): string {
  const prioridade = { recuperavel: 0, avaliar: 1, prazo_encerrado: 2, concluida: 3 } as const;
  const pendentes = crianca.praticas
    .filter((item) => item.status !== "concluida")
    .toSorted((a, b) => prioridade[a.status] - prioridade[b.status]);
  if (pendentes.length === 0) return "Todos os cinco cuidados estão concluídos.";
  return pendentes
    .slice(0, 3)
    .map((item) => `${item.pratica}: ${item.orientacao}`)
    .join(" ");
}

function Resumo({ dados }: { dados: FechamentoC2Out }) {
  const itens = [
    {
      titulo: "Fecham no quadrimestre",
      valor: dados.resumo.fecham_no_quadrimestre,
      apoio: "crianças ainda abaixo de 2 anos",
      icone: CalendarClock,
    },
    {
      titulo: "Precisam de ação",
      valor: dados.resumo.precisam_acao,
      apoio: "ainda podem somar pontos",
      icone: AlertTriangle,
    },
    {
      titulo: "Já completas",
      valor: dados.resumo.completas_antes_dos_2_anos,
      apoio: "100 pontos antes do aniversário",
      icone: CheckCircle2,
    },
    {
      titulo: "Encerradas",
      valor: dados.resumo.encerradas_no_quadrimestre,
      apoio: `média ${dados.resumo.media_pontuacao_encerradas.toLocaleString("pt-BR")} pontos`,
      icone: History,
    },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {itens.map((item) => (
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
  );
}

function LinhaCrianca({
  crianca,
  encerrada = false,
}: {
  crianca: CriancaFechamentoC2Out;
  encerrada?: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="min-w-48">
        <p className="font-medium">{crianca.nome_cidadao}</p>
        <p className="text-[11px] text-muted-foreground">
          {crianca.equipe_nome ?? "Sem equipe"}
          {crianca.micro_area ? ` · Micro-área ${crianca.micro_area}` : ""}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <p>{formatarData(crianca.data_limite)}</p>
        <p className="text-[11px] text-muted-foreground">
          {encerrada
            ? `Última avaliação: ${formatarData(crianca.data_ultima_avaliacao)}`
            : `${crianca.dias_restantes} dia(s) restantes`}
        </p>
      </TableCell>
      <TableCell><Praticas praticas={crianca.praticas} /></TableCell>
      <TableCell className="min-w-72 text-xs text-muted-foreground">
        {encerrada
          ? "Resultado preservado da última extração anterior aos 2 anos."
          : proximaAcao(crianca)}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={crianca.pontuacao_total === 100 ? "default" : "secondary"}>
          {crianca.pontuacao_total} pts
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function ListaCriancas({
  titulo,
  descricao,
  criancas,
  encerrada = false,
}: {
  titulo: string;
  descricao: string;
  criancas: CriancaFechamentoC2Out[];
  encerrada?: boolean;
}) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(criancas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itens = useMemo(
    () => criancas.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA),
    [criancas, paginaAtual],
  );
  useEffect(() => setPagina(1), [criancas]);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">{titulo}</CardTitle>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </CardHeader>
      {criancas.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma criança neste recorte.
        </p>
      ) : (
        <>
          <div className="grid gap-2 p-3 md:hidden">
            {itens.map((crianca) => (
              <div key={`${crianca.nome_cidadao}-${crianca.data_nascimento}`} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{crianca.nome_cidadao}</p>
                    <p className="text-xs text-muted-foreground">Fecha em {formatarData(crianca.data_limite)}</p>
                  </div>
                  <Badge variant="secondary">{crianca.pontuacao_total} pts</Badge>
                </div>
                <Praticas praticas={crianca.praticas} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {encerrada ? "Fechamento preservado no histórico." : proximaAcao(crianca)}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Criança</TableHead>
                  <TableHead>{encerrada ? "Fechou em" : "Completa 2 anos"}</TableHead>
                  <TableHead>Cuidados A–E</TableHead>
                  <TableHead>{encerrada ? "Registro" : "Próxima ação"}</TableHead>
                  <TableHead className="text-right">Pontuação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((crianca) => (
                  <LinhaCrianca
                    key={`${crianca.nome_cidadao}-${crianca.data_nascimento}`}
                    crianca={crianca}
                    encerrada={encerrada}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-3 pb-2">
            <IndicatorPagination
              currentPage={paginaAtual}
              totalPages={totalPaginas}
              onChange={setPagina}
              ariaLabel={`Paginação de ${titulo.toLocaleLowerCase("pt-BR")}`}
            />
          </div>
        </>
      )}
    </Card>
  );
}

export function FechamentoC2({
  dados,
  carregando,
  erro,
}: {
  dados: FechamentoC2Out | null;
  carregando: boolean;
  erro: string | null;
}) {
  if (carregando) {
    return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  }
  if (erro) return <p role="alert" className="text-sm text-destructive">{erro}</p>;
  if (!dados?.data_referencia) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sem referência clínica</EmptyTitle>
          <EmptyDescription>Conclua uma importação para iniciar o acompanhamento do fechamento C2.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Fechamento aos 2 anos</h2>
          <p className="text-xs text-muted-foreground">
            {dados.quadrimestre} · dados atualizados até {formatarData(dados.data_referencia)}
          </p>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          Atualiza a cada backup. Itens “recuperáveis” ainda podem gerar pontos antes dos 2 anos;
          vacinas exigem conferência dos intervalos na caderneta.
        </p>
      </div>

      <Resumo dados={dados} />

      <section aria-labelledby="meses-fechamento">
        <div className="mb-2 flex items-center gap-2">
          <Target className="size-4" aria-hidden />
          <h3 id="meses-fechamento" className="text-sm font-semibold">Visão por mês</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {dados.meses.map((mes) => (
            <Card key={mes.ano_mes} className="gap-2 p-4 shadow-none">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium capitalize">{formatarMes(mes.ano_mes)}</p>
                <Badge variant="outline">
                  {mes.status === "encerrado" ? "Fechado" : mes.status === "em_andamento" ? "Em andamento" : "Previsto"}
                </Badge>
              </div>
              <p className="text-2xl font-semibold tabular-nums">{mes.total_criancas}</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mes.total_100_pontos} com 100 pts</span>
                <span>{mes.total_abaixo_100} abaixo de 100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Média ${mes.media_pontuacao} pontos`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${mes.media_pontuacao}%` }} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <ListaCriancas
        titulo="Dá tempo de agir"
        descricao="Ordenadas pela data em que completam 2 anos e pela menor pontuação."
        criancas={dados.em_acompanhamento}
      />
      <ListaCriancas
        titulo="Fechadas neste quadrimestre"
        descricao="Último resultado disponível antes do aniversário de 2 anos; permanece visível após sair da lista ativa."
        criancas={dados.encerradas}
        encerrada
      />
    </div>
  );
}
