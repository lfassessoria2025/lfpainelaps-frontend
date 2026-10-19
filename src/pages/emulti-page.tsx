import { useEffect, useState } from "react";
import { CalendarClock, Download, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  IndicatorToolbar,
  IndicatorFilterField,
} from "@/components/indicators/indicator-toolbar";
import { HistoricoMensal } from "@/components/indicators/historico-mensal";
import type {
  EmultiM1Out,
  EmultiM2Out,
  FechamentoEmultiM1Out,
  FechamentoEmultiM2Out,
  PrefeituraOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { emultiService } from "@/services/emulti";
import { analyticsService } from "@/services/analytics";
import { prefeiturasService } from "@/services/prefeituras";

type IndicadorEmulti = "M1" | "M2";

const classificacoes = {
  otimo: "Ótimo",
  bom: "Bom",
  suficiente: "Suficiente",
  regular: "Regular",
} as const;

function numero(valor: number | null | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function data(valor: string | null) {
  return valor
    ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR")
    : "—";
}
const chaveEquipe = (item: {
  equipe_ine?: string | null;
  equipe_nome?: string | null;
}) => item.equipe_ine ?? item.equipe_nome ?? "sem-equipe";

function M1Conteudo({ dados }: { dados: FechamentoEmultiM1Out }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">{dados.numerador}</strong>
            <p className="text-xs text-muted-foreground">
              individuais e coletivos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Pessoas atendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">{dados.denominador}</strong>
            <p className="text-xs text-muted-foreground">
              identificadas no período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Média M1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">
              {numero(dados.media).toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })}
            </strong>
            <p className="text-xs text-muted-foreground">
              atendimentos por pessoa
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Classificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">
              {classificacoes[dados.classificacao]}
            </strong>
            <p className="text-xs text-muted-foreground">
              <CalendarClock className="mr-1 inline size-3" />
              últimos quatro meses
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm">
            Resultado por equipe eMulti — M1
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[760px] text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Equipe</TableHead>
                <TableHead>INE</TableHead>
                <TableHead>Atendimentos</TableHead>
                <TableHead>Pessoas</TableHead>
                <TableHead>Média</TableHead>
                <TableHead>Referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(dados.equipes) ? dados.equipes : []).map(
                (item: EmultiM1Out) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.equipe_nome}
                    </TableCell>
                    <TableCell>{item.equipe_ine}</TableCell>
                    <TableCell>{item.numerador}</TableCell>
                    <TableCell>{item.denominador}</TableCell>
                    <TableCell>
                      {numero(item.media).toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{data(item.data_referencia)}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function M2Conteudo({ dados }: { dados: FechamentoEmultiM2Out }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Ações compartilhadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">{dados.numerador}</strong>
            <p className="text-xs text-muted-foreground">numerador M2</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Total de ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">{dados.denominador}</strong>
            <p className="text-xs text-muted-foreground">
              ações realizadas pela eMulti
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Resultado M2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">
              {numero(dados.percentual).toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })}
              %
            </strong>
            <p className="text-xs text-muted-foreground">
              ações compartilhadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Classificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">
              {classificacoes[dados.classificacao]}
            </strong>
            <p className="text-xs text-muted-foreground">
              <CalendarClock className="mr-1 inline size-3" />
              últimos quatro meses
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm">
            Resultado por equipe eMulti — M2
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[760px] text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Equipe</TableHead>
                <TableHead>INE</TableHead>
                <TableHead>Compartilhadas</TableHead>
                <TableHead>Total de ações</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(dados.equipes) ? dados.equipes : []).map(
                (item: EmultiM2Out) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.equipe_nome}
                    </TableCell>
                    <TableCell>{item.equipe_ine}</TableCell>
                    <TableCell>{item.numerador}</TableCell>
                    <TableCell>{item.denominador}</TableCell>
                    <TableCell>
                      {numero(item.percentual).toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </TableCell>
                    <TableCell>{data(item.data_referencia)}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

export function EmultiPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | null>(null);
  const [indicador, setIndicador] = useState<IndicadorEmulti>("M1");
  const [m1, setM1] = useState<FechamentoEmultiM1Out | null>(null);
  const [m2, setM2] = useState<FechamentoEmultiM2Out | null>(null);
  const [linhasM1, setLinhasM1] = useState<EmultiM1Out[] | null>(null);
  const [linhasM2, setLinhasM2] = useState<EmultiM2Out[] | null>(null);
  const [historico, setHistorico] = useState<
    import("@/lib/api-types").SerieHistoricaPontoOut[] | null
  >(null);
  const [erro, setErro] = useState<string | null>(null);
  const [proibido, setProibido] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [equipeFiltro, setEquipeFiltro] = useState("todas");
  const [visao, setVisao] = useState<"acompanhamento" | "historico">(
    "acompanhamento",
  );

  useEffect(() => {
    prefeiturasService
      .list()
      .then((lista) => {
        setPrefeituras(lista);
        setPrefeituraId(
          (lista.find((item) => item.active) ?? lista[0])?.id ?? null,
        );
      })
      .catch(() => setPrefeituras([]));
  }, []);

  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setM1(null);
    setM2(null);
    setLinhasM1(null);
    setLinhasM2(null);
    setHistorico(null);
    setErro(null);
    setProibido(false);
    setEquipeFiltro("todas");
    const carregar =
      indicador === "M1"
        ? Promise.all([
            emultiService.list(prefeituraId, [], controller.signal),
            emultiService.fechamento(prefeituraId, [], controller.signal),
            analyticsService.historico(
              "M1",
              prefeituraId,
              controller.signal,
              true,
            ),
          ]).then(([lista, resumo, serie]) => {
            setLinhasM1(lista);
            setM1(resumo);
            setHistorico(serie);
          })
        : Promise.all([
            emultiService.listM2(prefeituraId, [], controller.signal),
            emultiService.fechamentoM2(prefeituraId, [], controller.signal),
            analyticsService.historico(
              "M2",
              prefeituraId,
              controller.signal,
              true,
            ),
          ]).then(([lista, resumo, serie]) => {
            setLinhasM2(lista);
            setM2(resumo);
            setHistorico(serie);
          });
    carregar.catch((falha: unknown) => {
      if (falha instanceof DOMException && falha.name === "AbortError") return;
      if (falha instanceof ApiError && falha.status === 403) setProibido(true);
      else
        setErro(
          falha instanceof ApiError
            ? falha.detail
            : `Não foi possível carregar o indicador ${indicador}.`,
        );
    });
    return () => controller.abort();
  }, [indicador, prefeituraId]);

  const exportar = async () => {
    if (prefeituraId === null) return;
    setExportando(true);
    try {
      const { blob, filename } =
        indicador === "M1"
          ? await emultiService.exportar(prefeituraId)
          : await emultiService.exportarM2(prefeituraId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  const fechamento = indicador === "M1" ? m1 : m2;
  const linhas = indicador === "M1" ? linhasM1 : linhasM2;
  const equipes = [
    ...new Map(
      (linhas ?? []).map((item) => [chaveEquipe(item), item]),
    ).values(),
  ].sort((a, b) => a.equipe_nome.localeCompare(b.equipe_nome, "pt-BR"));
  const linhasVisiveis = (linhas ?? []).filter(
    (item) => equipeFiltro === "todas" || chaveEquipe(item) === equipeFiltro,
  );
  const fechamentoVisivel =
    fechamento && equipeFiltro !== "todas"
      ? {
          ...fechamento,
          equipes: linhasVisiveis,
          numerador: linhasVisiveis.reduce(
            (total, item) => total + item.numerador,
            0,
          ),
          denominador: linhasVisiveis.reduce(
            (total, item) => total + item.denominador,
            0,
          ),
          ...(indicador === "M1"
            ? {
                media:
                  linhasVisiveis.reduce(
                    (total, item) => total + item.numerador,
                    0,
                  ) /
                  Math.max(
                    1,
                    linhasVisiveis.reduce(
                      (total, item) => total + item.denominador,
                      0,
                    ),
                  ),
              }
            : {
                percentual: linhasVisiveis.reduce(
                  (total, item) => total + item.denominador,
                  0,
                )
                  ? (100 *
                      linhasVisiveis.reduce(
                        (total, item) => total + item.numerador,
                        0,
                      )) /
                    linhasVisiveis.reduce(
                      (total, item) => total + item.denominador,
                      0,
                    )
                  : 0,
              }),
        }
      : fechamento;
  if (proibido)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlert />
          </EmptyMedia>
          <EmptyTitle>Sem permissão para ver a eMulti</EmptyTitle>
          <EmptyDescription>
            Solicite acesso aos indicadores da eMulti ao administrador.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <div className="min-w-0">
      <IndicatorToolbar
        municipality={
          <IndicatorFilterField label="Prefeitura">
            {prefeituras === null ? (
              <Skeleton className="h-8" />
            ) : (
              <Select
                value={prefeituraId ? String(prefeituraId) : undefined}
                onValueChange={(valor) => setPrefeituraId(Number(valor))}
              >
                <SelectTrigger aria-label="Prefeitura">
                  <SelectValue placeholder="Selecione">
                    {(value: string | null) =>
                      prefeituras.find((item) => String(item.id) === value)
                        ?.name ?? "Selecione"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {prefeituras.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </IndicatorFilterField>
        }
        filters={
          linhas ? (
            <IndicatorFilterField label="Equipe">
              <Select value={equipeFiltro} onValueChange={(valor) => { if (valor) setEquipeFiltro(valor); }}>
                <SelectTrigger aria-label="Filtrar por equipe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as equipes</SelectItem>
                  {equipes.map((item) => (
                    <SelectItem
                      key={chaveEquipe(item)}
                      value={chaveEquipe(item)}
                    >
                      {item.equipe_nome} · {item.equipe_ine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IndicatorFilterField>
          ) : undefined
        }
        summary={
          fechamento ? (
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{indicador}</strong> ·
              referência {data(fechamento.data_referencia)}
              {equipeFiltro !== "todas"
                ? ` · ${linhasVisiveis.length} equipe`
                : ""}
            </p>
          ) : undefined
        }
        actions={
          linhas?.length ? (
            <Button
              variant="outline"
              size="sm"
              disabled={exportando}
              onClick={() => void exportar()}
            >
              {exportando ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Baixar planilha
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge>{indicador}</Badge>
        <h1 className="text-xl font-semibold">
          {indicador === "M1"
            ? "Média de atendimentos por pessoa pela eMulti"
            : "Ações interprofissionais realizadas pela eMulti"}
        </h1>
      </div>
      <Tabs
        value={indicador}
        onValueChange={(value) => setIndicador(value as IndicadorEmulti)}
      >
        <TabsList variant="line" aria-label="Indicadores da eMulti">
          <TabsTrigger value="M1">M1 · Média por pessoa</TabsTrigger>
          <TabsTrigger value="M2">M2 · Ações compartilhadas</TabsTrigger>
        </TabsList>
      </Tabs>
      <Tabs
        value={visao}
        onValueChange={(value) =>
          setVisao(value as "acompanhamento" | "historico")
        }
      >
        <TabsList variant="line" aria-label={`Visões do indicador ${indicador}`}>
          <TabsTrigger value="acompanhamento">
            Tabela de acompanhamento
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="acompanhamento">
          {erro ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {erro}
            </p>
          ) : fechamentoVisivel === null ? (
            <Skeleton className="mt-4 h-72" />
          ) : indicador === "M1" ? (
            <M1Conteudo dados={fechamentoVisivel as FechamentoEmultiM1Out} />
          ) : (
            <M2Conteudo dados={fechamentoVisivel as FechamentoEmultiM2Out} />
          )}
        </TabsContent>
        <TabsContent value="historico">
          {historico ? (
            <HistoricoMensal
              pontos={historico}
              equipeFiltro={equipeFiltro}
              onEquipeFiltroChange={setEquipeFiltro}
              mostrarFiltroEquipe={false}
              titulo={`${indicador} · histórico mensal`}
            />
          ) : (
            <Skeleton className="mt-4 h-48" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
