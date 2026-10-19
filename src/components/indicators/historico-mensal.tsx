import { CalendarRange } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SerieHistoricaPontoOut } from "@/lib/api-types";
import { formatarValorAnalytics } from "@/lib/analytics-chart-data";

/**
 * O backend serializa `datetime` como ISO completo (ex.:
 * `2026-10-01T00:00:00`), enquanto algumas fontes legadas usam somente a
 * data (`2026-10-01`). Nunca concatenar `T00:00:00` sem verificar o formato:
 * isso produz `...T00:00:00T00:00:00`, uma data inválida que fazia o
 * ErrorBoundary derrubar as rotas M1/C1 ao renderizar o histórico.
 *
 * A competência é uma data civil. Por isso usamos apenas os dez primeiros
 * caracteres e UTC, evitando que o fuso do navegador mude o mês exibido.
 */
function parseDataReferencia(valor: string): Date | null {
  const data = valor.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const resultado = new Date(`${data}T00:00:00Z`);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function quadrimestre(data: string): string {
  const parsed = parseDataReferencia(data);
  if (!parsed) return "—";
  const mes = parsed.getUTCMonth() + 1;
  return `${Math.ceil(mes / 4)}º quadrimestre`;
}

function mesReferencia(data: string): string {
  const parsed = parseDataReferencia(data);
  return parsed
    ? new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed)
    : "—";
}

function resultado(ponto: SerieHistoricaPontoOut): string {
  const valor =
    ponto.valor_total ??
    ponto.praticas[0]?.valor ??
    ponto.praticas[0]?.percentual_cumprido ??
    null;
  return formatarValorAnalytics(valor, ponto.unidade ?? "percentual");
}

interface HistoricoMensalProps {
  pontos: SerieHistoricaPontoOut[];
  titulo?: string;
  /** Permite que o filtro da equipe também controle a tabela principal da página. */
  equipeFiltro?: string;
  onEquipeFiltroChange?: (valor: string) => void;
  mostrarFiltroEquipe?: boolean;
}

export function HistoricoMensal({
  pontos,
  titulo = "Histórico mensal",
  equipeFiltro: equipeFiltroExterno,
  onEquipeFiltroChange,
  mostrarFiltroEquipe = true,
}: HistoricoMensalProps) {
  const [equipeFiltroInterno, setEquipeFiltroInterno] = useState("todas");
  const [competenciaFiltro, setCompetenciaFiltro] = useState("todas");
  const equipeFiltro = equipeFiltroExterno ?? equipeFiltroInterno;
  const setEquipeFiltro = (valor: string | null) => {
    if (!valor) return;
    if (onEquipeFiltroChange) onEquipeFiltroChange(valor);
    else setEquipeFiltroInterno(valor);
  };
  useEffect(() => {
    setEquipeFiltroInterno("todas");
    onEquipeFiltroChange?.("todas");
    setCompetenciaFiltro("todas");
  }, [pontos]);
  const equipes = [
    ...new Map(
      pontos
        .filter((ponto) => ponto.equipe_nome || ponto.equipe_ine)
        .map((ponto) => [
          ponto.equipe_ine ?? ponto.equipe_nome ?? "",
          {
            chave: ponto.equipe_ine ?? ponto.equipe_nome ?? "",
            nome: ponto.equipe_nome ?? "Equipe sem nome",
            ine: ponto.equipe_ine,
          },
        ]),
    ).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const competencias = [
    ...new Set(
      pontos
        .map((ponto) => ponto.data_referencia.slice(0, 7))
        .filter((valor) => /^\d{4}-\d{2}$/.test(valor)),
    ),
  ]
    .sort()
    .reverse();
  const pontosFiltrados = pontos.filter((ponto) => {
    const equipe = ponto.equipe_ine ?? ponto.equipe_nome ?? "";
    const equipeOk =
      !mostrarFiltroEquipe && equipeFiltro === "todas"
        ? true
        : equipeFiltro === "todas" || equipe === equipeFiltro;
    const competenciaOk =
      competenciaFiltro === "todas" ||
      ponto.data_referencia.startsWith(competenciaFiltro);
    return equipeOk && competenciaOk;
  });
  const ordenados = [...pontosFiltrados].sort((a, b) => {
    const dataA =
      parseDataReferencia(a.data_referencia)?.getTime() ??
      Number.NEGATIVE_INFINITY;
    const dataB =
      parseDataReferencia(b.data_referencia)?.getTime() ??
      Number.NEGATIVE_INFINITY;
    return dataB - dataA || b.data_referencia.localeCompare(a.data_referencia);
  });
  const temEquipe = ordenados.some(
    (ponto) => ponto.equipe_nome || ponto.equipe_ine,
  );
  const contagens = (ponto: SerieHistoricaPontoOut) => ({
    numerador: ponto.praticas.reduce(
      (soma, pratica) => soma + pratica.total_cumprida,
      0,
    ),
    denominador: ponto.praticas.reduce(
      (soma, pratica) => soma + pratica.total_gestantes,
      0,
    ),
  });
  const resumos = [
    ...ordenados
      .reduce((mapa, ponto) => {
        const data = parseDataReferencia(ponto.data_referencia);
        if (!data) return mapa;
        const trimestre = quadrimestre(ponto.data_referencia);
        const chave = `${ponto.equipe_ine ?? ""}|${ponto.equipe_nome ?? ""}|${data.getUTCFullYear()}-${trimestre}`;
        const atual = mapa.get(chave) ?? {
          equipe_nome: ponto.equipe_nome,
          equipe_ine: ponto.equipe_ine,
          trimestre,
          data,
          numerador: 0,
          denominador: 0,
          unidade: ponto.unidade ?? "percentual",
        };
        const valores = contagens(ponto);
        atual.numerador += valores.numerador;
        atual.denominador += valores.denominador;
        mapa.set(chave, atual);
        return mapa;
      }, new Map<string, { equipe_nome?: string | null; equipe_ine?: string | null; trimestre: string; data: Date; numerador: number; denominador: number; unidade: NonNullable<SerieHistoricaPontoOut["unidade"]> }>())
      .values(),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());
  const resultadoResumo = (resumo: (typeof resumos)[number]) => {
    if (resumo.unidade === "pontuacao") {
      const total = ordenados
        .filter(
          (ponto) =>
            (ponto.unidade ?? "percentual") === "pontuacao" &&
            (ponto.equipe_ine ?? "") === (resumo.equipe_ine ?? "") &&
            (ponto.equipe_nome ?? "") === (resumo.equipe_nome ?? "") &&
            quadrimestre(ponto.data_referencia) === resumo.trimestre,
        )
        .reduce((soma, ponto) => soma + (ponto.valor_total ?? 0), 0);
      return formatarValorAnalytics(total, resumo.unidade);
    }
    const valor =
      resumo.unidade === "media"
        ? resumo.denominador
          ? resumo.numerador / resumo.denominador
          : 0
        : resumo.denominador
          ? (100 * resumo.numerador) / resumo.denominador
          : 0;
    return formatarValorAnalytics(valor, resumo.unidade);
  };
  const rotuloCompetencia = (valor: string) => {
    const data = parseDataReferencia(`${valor}-01`);
    return data
      ? new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(data)
      : valor;
  };
  return (
    <Card className="mt-4 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarRange className="size-4 text-primary" />
              {titulo}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Valores separados por equipe e competência, com resumo acumulado
              do quadrimestre.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {mostrarFiltroEquipe ? (
              <label className="grid min-w-44 gap-1 text-[11px] text-muted-foreground">
                Equipe
                <Select value={equipeFiltro} onValueChange={setEquipeFiltro}>
                  <SelectTrigger aria-label="Filtrar histórico por equipe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as equipes</SelectItem>
                    {equipes.map((equipe) => (
                      <SelectItem key={equipe.chave} value={equipe.chave}>
                        {equipe.nome}
                        {equipe.ine ? ` · ${equipe.ine}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
            <label className="grid min-w-44 gap-1 text-[11px] text-muted-foreground">
              Mês de referência
              <Select
                value={competenciaFiltro}
                onValueChange={(valor) => {
                  if (valor) setCompetenciaFiltro(valor);
                }}
              >
                <SelectTrigger aria-label="Filtrar histórico por mês">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos os meses</SelectItem>
                  {competencias.map((competencia) => (
                    <SelectItem key={competencia} value={competencia}>
                      {rotuloCompetencia(competencia)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {ordenados.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Ainda não há competências mensais importadas.
          </p>
        ) : (
          <>
            <table className="w-full min-w-[760px] text-xs">
              <thead className="border-b bg-muted/20">
                <tr>
                  {temEquipe ? (
                    <>
                      <th className="px-4 py-3 text-left font-medium">
                        Equipe
                      </th>
                      <th className="px-4 py-3 text-left font-medium">INE</th>
                    </>
                  ) : null}
                  <th className="px-4 py-3 text-left font-medium">
                    Mês de referência
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Quadrimestre
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Numerador
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Denominador
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((ponto) => {
                  const valores = contagens(ponto);
                  return (
                    <tr
                      key={`${ponto.equipe_ine ?? ""}-${ponto.equipe_nome ?? ""}-${ponto.importacao_id}-${ponto.data_referencia}`}
                      className="border-b last:border-0"
                    >
                      {temEquipe ? (
                        <>
                          <td className="px-4 py-3 font-medium">
                            {ponto.equipe_nome ?? "Sem equipe"}
                          </td>
                          <td className="px-4 py-3">
                            {ponto.equipe_ine ?? "—"}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3">
                        {mesReferencia(ponto.data_referencia)}
                      </td>
                      <td className="px-4 py-3">
                        {quadrimestre(ponto.data_referencia)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {valores.numerador.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {valores.denominador.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {resultado(ponto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t">
              <p className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                Resumo acumulado do quadrimestre
              </p>
              <table className="w-full min-w-[760px] text-xs">
                <thead className="border-b bg-muted/20">
                  <tr>
                    {temEquipe ? (
                      <>
                        <th className="px-4 py-3 text-left font-medium">
                          Equipe
                        </th>
                        <th className="px-4 py-3 text-left font-medium">INE</th>
                      </>
                    ) : null}
                    <th className="px-4 py-3 text-left font-medium">
                      Quadrimestre
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Numerador acumulado
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Denominador acumulado
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumos.map((resumo) => (
                    <tr
                      key={`${resumo.equipe_ine ?? ""}-${resumo.equipe_nome ?? ""}-${resumo.trimestre}`}
                      className="border-b last:border-0"
                    >
                      {temEquipe ? (
                        <>
                          <td className="px-4 py-3 font-medium">
                            {resumo.equipe_nome ?? "Sem equipe"}
                          </td>
                          <td className="px-4 py-3">
                            {resumo.equipe_ine ?? "—"}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3">
                        Acumulado · {resumo.trimestre}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {resumo.numerador.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {resumo.denominador.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {resultadoResumo(resumo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
