import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  History,
  Target,
  X,
} from "lucide-react";
import { IndicatorPagination } from "@/components/indicators/indicator-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";
import type {
  FechamentoC3Out,
  GestanteFechamentoC3Out,
  PraticaFechamentoC3Out,
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

const praticaClass: Record<PraticaFechamentoC3Out["status"], string> = {
  concluida:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  recuperavel:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  aguardar_desfecho:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  prazo_encerrado: "border-border bg-muted text-muted-foreground",
};

function Praticas({ praticas }: { praticas: PraticaFechamentoC3Out[] }) {
  return (
    <div className="flex w-60 flex-wrap gap-1" aria-label="Situação das práticas C3">
      {praticas.map((pratica) => (
        <span
          key={pratica.pratica}
          title={`${pratica.titulo}: ${pratica.orientacao}`}
          className={cn(
            "inline-flex min-w-9 justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
            praticaClass[pratica.status],
          )}
        >
          {pratica.pratica} {pratica.pontos > 0 ? `+${pratica.pontos}` : "0"}
        </span>
      ))}
    </div>
  );
}

function ProximasAcoes({ gestante }: { gestante: GestanteFechamentoC3Out }) {
  const prioridade = {
    recuperavel: 0,
    aguardar_desfecho: 1,
    prazo_encerrado: 2,
    concluida: 3,
  } as const;
  const acoes = gestante.praticas
    .filter((pratica) => pratica.status !== "concluida")
    .toSorted((a, b) => prioridade[a.status] - prioridade[b.status])
    .slice(0, 4);
  if (acoes.length === 0) return <p>Todos os cuidados foram concluídos.</p>;
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4">
      {acoes.map((pratica) => (
        <li key={pratica.pratica} className="break-words">
          <strong className="text-foreground">{pratica.pratica}:</strong> {pratica.orientacao}
        </li>
      ))}
    </ul>
  );
}

function Resumo({ dados }: { dados: FechamentoC3Out }) {
  const itens = [
    {
      titulo: "Fecham no quadrimestre",
      valor: dados.resumo.fecham_no_quadrimestre,
      apoio: "DPP ou desfecho no período",
      icone: CalendarClock,
    },
    {
      titulo: "Em aberto",
      valor: dados.resumo.abertas,
      apoio: "sem desfecho confirmado",
      icone: HeartPulse,
    },
    {
      titulo: "Fechadas",
      valor: dados.resumo.fechadas,
      apoio: `${dados.resumo.abortos} aborto(s) identificado(s)`,
      icone: History,
    },
    {
      titulo: "Com 100 pontos",
      valor: dados.resumo.total_100_pontos,
      apoio: `média das fechadas: ${dados.resumo.media_pontuacao_fechadas.toLocaleString("pt-BR")} pts`,
      icone: CheckCircle2,
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

function Situacao({ gestante }: { gestante: GestanteFechamentoC3Out }) {
  if (gestante.status === "aborto") {
    return <Badge variant="destructive">Aborto · encerrado</Badge>;
  }
  if (gestante.status === "fechada") {
    return <Badge className="bg-emerald-600">Desfecho confirmado</Badge>;
  }
  return <Badge variant="secondary">DPP · em aberto</Badge>;
}

function LinhaGestante({ gestante }: { gestante: GestanteFechamentoC3Out }) {
  return (
    <TableRow>
      <TableCell className="w-56 min-w-56">
        <p className="font-medium">{gestante.nome_cidadao}</p>
        <p className="text-[11px] text-muted-foreground">
          {gestante.equipe_nome ?? "Sem equipe"}
          {gestante.micro_area ? ` · Micro-área ${gestante.micro_area}` : ""}
        </p>
      </TableCell>
      <TableCell className="w-36 min-w-36 whitespace-nowrap">
        <p>{formatarData(gestante.data_fechamento)}</p>
        <p className="text-[11px] text-muted-foreground">
          {gestante.data_fechamento_confirmada
            ? "Data confirmada no PEC"
            : `${gestante.dias_restantes} dia(s) para a DPP`}
        </p>
      </TableCell>
      <TableCell className="w-40 min-w-40"><Situacao gestante={gestante} /></TableCell>
      <TableCell className="w-60 min-w-60"><Praticas praticas={gestante.praticas} /></TableCell>
      <TableCell className="w-96 min-w-96 whitespace-normal text-xs leading-4 text-muted-foreground">
        <ProximasAcoes gestante={gestante} />
      </TableCell>
      <TableCell className="w-24 text-right">
        <Badge variant={gestante.pontuacao_total === 100 ? "default" : "secondary"}>
          {gestante.pontuacao_total} pts
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function ListaGestantes({
  titulo,
  descricao,
  gestantes,
}: {
  titulo: string;
  descricao: string;
  gestantes: GestanteFechamentoC3Out[];
}) {
  const [pagina, setPagina] = useState(1);
  const { dragging, containerProps } = useHorizontalDrag();
  const totalPaginas = Math.max(1, Math.ceil(gestantes.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itens = useMemo(
    () => gestantes.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA),
    [gestantes, paginaAtual],
  );
  useEffect(() => setPagina(1), [gestantes]);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">{titulo}</CardTitle>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </CardHeader>
      {gestantes.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma gestante neste recorte.
        </p>
      ) : (
        <>
          <div className="grid gap-2 p-3 md:hidden">
            {itens.map((gestante) => (
              <div
                key={`${gestante.nome_cidadao}-${gestante.dt_inicio_gestacao}`}
                className="rounded-lg border p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{gestante.nome_cidadao}</p>
                    <p className="text-xs text-muted-foreground">
                      {gestante.data_fechamento_confirmada ? "Fechou" : "DPP"} em {formatarData(gestante.data_fechamento)}
                    </p>
                  </div>
                  <Badge>{gestante.pontuacao_total} pts</Badge>
                </div>
                <Situacao gestante={gestante} />
                <div className="mt-2"><Praticas praticas={gestante.praticas} /></div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <ProximasAcoes gestante={gestante} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table
              className="min-w-[1250px] table-fixed text-xs [&_th]:whitespace-normal [&_td]:align-top"
              containerClassName={cn(
                "max-w-full cursor-grab overscroll-x-contain",
                dragging && "cursor-grabbing select-none",
              )}
              containerProps={{
                ...containerProps,
                role: "region",
                "aria-label": `${titulo}; use as setas ou clique e arraste para ver as colunas`,
              }}
            >
              <TableHeader className="sticky top-0 z-[3] select-none bg-muted shadow-sm">
                <TableRow>
                  <TableHead className="w-56">Gestante</TableHead>
                  <TableHead className="w-36">DPP ou desfecho</TableHead>
                  <TableHead className="w-40">Situação</TableHead>
                  <TableHead className="w-60">Cuidados A–K</TableHead>
                  <TableHead className="w-96">Próxima ação</TableHead>
                  <TableHead className="w-24 text-right">Pontuação C3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((gestante) => (
                  <LinhaGestante
                    key={`${gestante.nome_cidadao}-${gestante.dt_inicio_gestacao}`}
                    gestante={gestante}
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

export function FechamentoC3({
  dados,
  carregando,
  erro,
}: {
  dados: FechamentoC3Out | null;
  carregando: boolean;
  erro: string | null;
}) {
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const listasRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMesSelecionado(null), [dados?.data_referencia]);
  const abertas = useMemo(
    () =>
      dados?.abertas.filter(
        (gestante) => mesSelecionado === null || gestante.data_fechamento.startsWith(mesSelecionado),
      ) ?? [],
    [dados?.abertas, mesSelecionado],
  );
  const fechadas = useMemo(
    () =>
      dados?.fechadas.filter(
        (gestante) => mesSelecionado === null || gestante.data_fechamento.startsWith(mesSelecionado),
      ) ?? [],
    [dados?.fechadas, mesSelecionado],
  );

  function selecionarMes(anoMes: string) {
    setMesSelecionado((atual) => (atual === anoMes ? null : anoMes));
    window.requestAnimationFrame(() => {
      const listas = listasRef.current;
      if (listas && typeof listas.scrollIntoView === "function") {
        listas.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (carregando) {
    return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  }
  if (erro) return <p role="alert" className="text-sm text-destructive">{erro}</p>;
  if (!dados?.data_referencia) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sem referência clínica</EmptyTitle>
          <EmptyDescription>Conclua uma importação para iniciar o acompanhamento do fechamento C3.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Fechamento da gestação</h2>
          <p className="text-xs text-muted-foreground">
            {dados.quadrimestre} · dados atualizados até {formatarData(dados.data_referencia)}
          </p>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          DPP é previsão. A gestação só aparece como fechada quando existe desfecho clínico registrado no PEC.
        </p>
      </div>

      <Resumo dados={dados} />

      <section aria-labelledby="meses-fechamento-c3">
        <div className="mb-2 flex items-center gap-2">
          <Target className="size-4" aria-hidden />
          <h3 id="meses-fechamento-c3" className="text-sm font-semibold">Visão por mês</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {dados.meses.map((mes) => (
            <Card
              key={mes.ano_mes}
              size="sm"
              className={cn(
                "gap-0 py-0 shadow-none",
                mesSelecionado === mes.ano_mes && "ring-2 ring-primary",
              )}
            >
              <CardHeader className="p-0">
                <Button
                  variant="ghost"
                  className="h-auto w-full items-stretch whitespace-normal p-3 text-left"
                  aria-pressed={mesSelecionado === mes.ano_mes}
                  aria-label={`Mostrar ${mes.total_gestantes} gestante(s) que fecham em ${formatarMes(mes.ano_mes)}`}
                  onClick={() => selecionarMes(mes.ano_mes)}
                >
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium capitalize">{formatarMes(mes.ano_mes)}</p>
                      <Badge variant="outline">
                        {mes.status === "encerrado"
                          ? "Encerrado"
                          : mes.status === "em_andamento"
                            ? "Em andamento"
                            : "Previsto"}
                      </Badge>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">{mes.total_gestantes}</p>
                    <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span>{mes.total_fechadas} fechada(s)</span>
                      <span>{mes.total_abertas} aberta(s)</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Média ${mes.media_pontuacao} pontos`}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${mes.media_pontuacao}%` }} />
                    </div>
                    <span className="text-xs font-medium text-primary">Ver gestantes</span>
                  </div>
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <div ref={listasRef} className="flex scroll-mt-4 flex-col gap-3">
        {mesSelecionado ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-sm">
              Mostrando gestantes de <strong className="capitalize">{formatarMes(mesSelecionado)}</strong>
            </p>
            <Button variant="ghost" size="sm" onClick={() => setMesSelecionado(null)}>
              <X data-icon="inline-start" /> Limpar mês
            </Button>
          </div>
        ) : null}
        <ListaGestantes
          titulo="Dá tempo de agir"
          descricao="DPP no quadrimestre, sem desfecho confirmado, ordenadas pela data e menor pontuação."
          gestantes={abertas}
        />
        <ListaGestantes
          titulo="Fechadas neste quadrimestre"
          descricao="Desfechos e abortos confirmados no PEC, com a pontuação do último backup."
          gestantes={fechadas}
        />
      </div>
    </div>
  );
}
