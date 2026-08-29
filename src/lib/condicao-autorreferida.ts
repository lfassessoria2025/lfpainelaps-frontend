import type { AcaoCondicaoAutorreferida, MotivoAcaoCondicao } from "@/lib/api-types";

/** Tipos que a interface sabe apresentar. Cada um terá fonte/regra própria
 * definida pelo backend; compartilhar o componente não compartilha regra. */
export type TipoCondicaoAutorreferida = "gestante";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface ApresentacaoAcaoCondicao {
  rotulo: string;
  variant: BadgeVariant;
}

type DefinicaoAcaoCondicao =
  | { verbo: string; variant: BadgeVariant }
  | { rotulo: string; variant: BadgeVariant };

const NOME_CONDICAO: Record<TipoCondicaoAutorreferida, string> = {
  gestante: "Gestante",
};

const APRESENTACAO_ACAO: Record<AcaoCondicaoAutorreferida, DefinicaoAcaoCondicao> = {
  inserir: { verbo: "Inserir em condição de saúde", variant: "secondary" },
  remover: { verbo: "Remover condição de saúde", variant: "destructive" },
  nenhuma_acao: { rotulo: "Nenhuma ação", variant: "outline" },
  revisar_cadastro: { verbo: "Revisar cadastro da condição", variant: "secondary" },
};

const MOTIVO_ROTULO: Record<MotivoAcaoCondicao, string> = {
  dados_legados_sem_avaliacao: "Importação anterior à avaliação automática; confira o cadastro.",
  cadastro_coerente: "A condição está coerente com o acompanhamento.",
  condicao_nao_marcada: "A última ficha válida não marca a condição Gestante.",
  condicao_ainda_marcada: "A última ficha válida ainda marca a condição Gestante.",
  cadastro_ausente_ou_nao_informado: "A última ficha válida está ausente ou não informa a condição.",
  estado_esperado_indeterminado: "Os dados não permitem determinar com segurança o estado esperado.",
  registro_historico: "Registro histórico; a orientação está na gestação mais recente.",
};

export function apresentarAcaoCondicao(
  acao: AcaoCondicaoAutorreferida,
  tipo: TipoCondicaoAutorreferida = "gestante",
): ApresentacaoAcaoCondicao {
  const apresentacao = APRESENTACAO_ACAO[acao];
  if ("rotulo" in apresentacao) return apresentacao;
  return { rotulo: `${apresentacao.verbo} ${NOME_CONDICAO[tipo]}`, variant: apresentacao.variant };
}

export function explicarMotivoCondicao(motivo: MotivoAcaoCondicao): string {
  return MOTIVO_ROTULO[motivo];
}
