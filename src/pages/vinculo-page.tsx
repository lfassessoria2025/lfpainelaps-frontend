import { useEffect, useState } from "react";
import { Download, Link2, Loader2, ShieldAlert } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IndicatorToolbar,
  IndicatorFilterField,
} from "@/components/indicators/indicator-toolbar";
import { HistoricoMensal } from "@/components/indicators/historico-mensal";
import type {
  FechamentoVinculoOut,
  PrefeituraOut,
  VinculoOut,
} from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { analyticsService } from "@/services/analytics";
import { prefeiturasService } from "@/services/prefeituras";
import { vinculoService } from "@/services/vinculo";

const data = (valor: string | null) =>
  valor
    ? new Date(`${valor.slice(0, 10)}T00:00:00Z`).toLocaleDateString("pt-BR")
    : "—";
const numero = (valor: number | null | undefined) =>
  typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
const chaveEquipe = (item: {
  equipe_ine?: string | null;
  equipe_nome?: string | null;
}) => item.equipe_ine ?? item.equipe_nome ?? "sem-equipe";

export function VinculoPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | null>(null);
  const [linhas, setLinhas] = useState<VinculoOut[] | null>(null);
  const [fechamento, setFechamento] = useState<FechamentoVinculoOut | null>(
    null,
  );
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
    setLinhas(null);
    setFechamento(null);
    setHistorico(null);
    setErro(null);
    setProibido(false);
    setEquipeFiltro("todas");
    Promise.all([
      vinculoService.list(prefeituraId, controller.signal),
      vinculoService.fechamento(prefeituraId, controller.signal),
      analyticsService.historico("V1", prefeituraId, controller.signal, true),
    ])
      .then(([lista, resumo, serie]) => {
        setLinhas(lista);
        setFechamento(resumo);
        setHistorico(serie);
      })
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError")
          return;
        if (falha instanceof ApiError && falha.status === 403)
          setProibido(true);
        else
          setErro(
            falha instanceof ApiError
              ? falha.detail
              : "Não foi possível carregar o indicador V1.",
          );
      });
    return () => controller.abort();
  }, [prefeituraId]);
  const exportar = async () => {
    if (prefeituraId === null) return;
    setExportando(true);
    try {
      const { blob, filename } = await vinculoService.exportar(prefeituraId);
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
          pessoas_cadastradas: linhasVisiveis.reduce(
            (total, item) => total + numero(item.pessoas_cadastradas),
            0,
          ),
          cadastro_ponderado: linhasVisiveis.reduce(
            (total, item) => total + numero(item.cadastro_ponderado),
            0,
          ),
          pessoas_acompanhadas: linhasVisiveis.reduce(
            (total, item) => total + numero(item.pessoas_acompanhadas),
            0,
          ),
          acompanhamento_ponderado: linhasVisiveis.reduce(
            (total, item) => total + numero(item.acompanhamento_ponderado),
            0,
          ),
          pontos_total: linhasVisiveis.reduce(
            (total, item) => total + numero(item.pontos_total),
            0,
          ),
        }
      : fechamento;
  if (proibido)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlert />
          </EmptyMedia>
          <EmptyTitle>Sem permissão para ver o V1</EmptyTitle>
          <EmptyDescription>
            Solicite acesso ao indicador de vínculo e acompanhamento.
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
              <strong className="text-foreground">V1</strong> · referência{" "}
              {data(fechamento.data_referencia)}
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
      <div className="mb-4 flex items-center gap-2">
        <Badge>
          <Link2 data-icon="inline-start" />
          V1
        </Badge>
        <h1 className="text-xl font-semibold">
          Vínculo e acompanhamento territorial
        </h1>
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : fechamentoVisivel === null ? (
        <Skeleton className="h-72" />
      ) : (
        <Tabs
          value={visao}
          onValueChange={(value) =>
            setVisao(value as "acompanhamento" | "historico")
          }
        >
          <TabsList variant="line" aria-label="Visões do vínculo e acompanhamento">
            <TabsTrigger value="acompanhamento">
              Tabela de acompanhamento
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico mensal</TabsTrigger>
          </TabsList>
          <TabsContent value="acompanhamento">
            <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">
                  Pessoas cadastradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <strong className="text-2xl">
                  {numero(fechamentoVisivel.pessoas_cadastradas).toLocaleString(
                    "pt-BR",
                  )}
                </strong>
                <p className="text-xs text-muted-foreground">
                  cadastro atualizado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">
                  Cadastro ponderado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <strong className="text-2xl">
                  {numero(fechamentoVisivel.cadastro_ponderado).toLocaleString(
                    "pt-BR",
                  )}
                </strong>
                <p className="text-xs text-muted-foreground">
                  componente do V1
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">
                  Pessoas acompanhadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <strong className="text-2xl">
                  {numero(
                    fechamentoVisivel.pessoas_acompanhadas,
                  ).toLocaleString("pt-BR")}
                </strong>
                <p className="text-xs text-muted-foreground">
                  acompanhamento em 12 meses
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">
                  Pontuação total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <strong className="text-2xl">
                  {fechamentoVisivel.pontos_total === null
                    ? "—"
                    : numero(fechamentoVisivel.pontos_total).toLocaleString(
                        "pt-BR",
                      )}
                </strong>
                <p className="text-xs text-muted-foreground">
                  fechamento quadrimestral
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4 overflow-hidden py-0">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Resultado por equipe</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table className="min-w-[1080px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipe</TableHead>
                    <TableHead>INE</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Cadastro pond.</TableHead>
                    <TableHead>Acompanhadas</TableHead>
                    <TableHead>Acomp. pond.</TableHead>
                    <TableHead>Índice cadastro</TableHead>
                    <TableHead>Índice acompanhamento</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead>Referência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasVisiveis.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.equipe_nome}
                      </TableCell>
                      <TableCell>{item.equipe_ine}</TableCell>
                      <TableCell>
                        {numero(item.pessoas_cadastradas).toLocaleString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>
                        {numero(item.cadastro_ponderado).toLocaleString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>
                        {numero(item.pessoas_acompanhadas).toLocaleString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>
                        {numero(item.acompanhamento_ponderado).toLocaleString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>
                        {item.indice_cadastro === null
                          ? "—"
                          : `${numero(item.indice_cadastro).toLocaleString("pt-BR")} %`}
                      </TableCell>
                      <TableCell>
                        {item.indice_acompanhamento === null
                          ? "—"
                          : `${numero(item.indice_acompanhamento).toLocaleString("pt-BR")} %`}
                      </TableCell>
                      <TableCell>
                        {item.pontos_total === null
                          ? "—"
                          : numero(item.pontos_total).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{data(item.data_referencia)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
            </>
          </TabsContent>
          <TabsContent value="historico">
            {historico ? (
              <HistoricoMensal
                pontos={historico}
                equipeFiltro={equipeFiltro}
                onEquipeFiltroChange={setEquipeFiltro}
                mostrarFiltroEquipe={false}
                titulo="V1 · histórico mensal e fechamento do quadrimestre"
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
