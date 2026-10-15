import { useEffect, useState } from "react";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndicatorToolbar, IndicatorFilterField } from "@/components/indicators/indicator-toolbar";
import type { FechamentoMaisAcessoC1Out, MaisAcessoC1Out, PrefeituraOut } from "@/lib/api-types";
import { ApiError } from "@/lib/http";
import { maisAcessoService } from "@/services/mais-acesso";
import { prefeiturasService } from "@/services/prefeituras";

const classificacoes = { otimo: "Ótimo", bom: "Bom", suficiente: "Suficiente", regular: "Regular" } as const;
const data = (valor: string | null) => valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR") : "—";

export function MaisAcessoPage() {
  const [prefeituras, setPrefeituras] = useState<PrefeituraOut[] | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | null>(null);
  const [linhas, setLinhas] = useState<MaisAcessoC1Out[] | null>(null);
  const [fechamento, setFechamento] = useState<FechamentoMaisAcessoC1Out | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [proibido, setProibido] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    prefeiturasService.list().then((lista) => {
      setPrefeituras(lista);
      setPrefeituraId((lista.find((item) => item.active) ?? lista[0])?.id ?? null);
    }).catch(() => setPrefeituras([]));
  }, []);
  useEffect(() => {
    if (prefeituraId === null) return;
    const controller = new AbortController();
    setLinhas(null); setFechamento(null); setErro(null); setProibido(false);
    Promise.all([maisAcessoService.list(prefeituraId, controller.signal), maisAcessoService.fechamento(prefeituraId, controller.signal)])
      .then(([lista, resumo]) => { setLinhas(lista); setFechamento(resumo); })
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        if (falha instanceof ApiError && falha.status === 403) setProibido(true);
        else setErro(falha instanceof ApiError ? falha.detail : "Não foi possível carregar o indicador C1.");
      });
    return () => controller.abort();
  }, [prefeituraId]);
  const exportar = async () => {
    if (prefeituraId === null) return;
    setExportando(true);
    try {
      const { blob, filename } = await maisAcessoService.exportar(prefeituraId);
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
    } finally { setExportando(false); }
  };
  if (proibido) return <Empty><EmptyHeader><EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia><EmptyTitle>Sem permissão para ver o C1</EmptyTitle><EmptyDescription>Solicite acesso ao indicador Mais acesso à APS.</EmptyDescription></EmptyHeader></Empty>;
  return <div className="min-w-0">
    <IndicatorToolbar municipality={<IndicatorFilterField label="Prefeitura">{prefeituras === null ? <Skeleton className="h-8" /> : <Select value={prefeituraId ? String(prefeituraId) : undefined} onValueChange={(valor) => setPrefeituraId(Number(valor))}><SelectTrigger aria-label="Prefeitura"><SelectValue placeholder="Selecione">{(value: string | null) => prefeituras.find((item) => String(item.id) === value)?.name ?? "Selecione"}</SelectValue></SelectTrigger><SelectContent>{prefeituras.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>}</IndicatorFilterField>} summary={fechamento ? <p className="text-xs text-muted-foreground"><strong className="text-foreground">C1</strong> · referência {data(fechamento.data_referencia)}</p> : undefined} actions={linhas?.length ? <Button variant="outline" size="sm" disabled={exportando} onClick={() => void exportar()}>{exportando ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}Baixar planilha</Button> : undefined} />
    <div className="mb-4 flex items-center gap-2"><Badge>C1</Badge><h1 className="text-xl font-semibold">Mais acesso à Atenção Primária à Saúde</h1></div>
    {erro ? <p role="alert" className="text-sm text-destructive">{erro}</p> : fechamento === null ? <Skeleton className="h-72" /> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card><CardHeader><CardTitle className="text-xs text-muted-foreground">Demanda programada</CardTitle></CardHeader><CardContent><strong className="text-2xl">{fechamento.numerador}</strong><p className="text-xs text-muted-foreground">numerador</p></CardContent></Card><Card><CardHeader><CardTitle className="text-xs text-muted-foreground">Total de atendimentos</CardTitle></CardHeader><CardContent><strong className="text-2xl">{fechamento.denominador}</strong><p className="text-xs text-muted-foreground">programados + espontâneos</p></CardContent></Card><Card><CardHeader><CardTitle className="text-xs text-muted-foreground">Resultado C1</CardTitle></CardHeader><CardContent><strong className="text-2xl">{fechamento.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</strong><p className="text-xs text-muted-foreground">acesso programado</p></CardContent></Card><Card><CardHeader><CardTitle className="text-xs text-muted-foreground">Classificação</CardTitle></CardHeader><CardContent><strong className="text-2xl">{classificacoes[fechamento.classificacao]}</strong><p className="text-xs text-muted-foreground">competência mensal</p></CardContent></Card></div><Card className="mt-4 overflow-hidden py-0"><CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm">Resultado por equipe APS</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><Table className="min-w-[760px] text-xs"><TableHeader><TableRow><TableHead>Equipe</TableHead><TableHead>INE</TableHead><TableHead>Programada</TableHead><TableHead>Total</TableHead><TableHead>Resultado</TableHead><TableHead>Referência</TableHead></TableRow></TableHeader><TableBody>{(linhas ?? []).map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.equipe_nome}</TableCell><TableCell>{item.equipe_ine}</TableCell><TableCell>{item.numerador}</TableCell><TableCell>{item.denominador}</TableCell><TableCell>{item.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</TableCell><TableCell>{data(item.data_referencia)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>}
  </div>;
}
