import type { AcaoCondicaoAutorreferida, MotivoAcaoCondicao } from "@/lib/api-types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface ApresentacaoAcaoCondicao {
  rotulo: string;
  variant: BadgeVariant;
}

const APRESENTACAO_ACAO: Record<AcaoCondicaoAutorreferida, ApresentacaoAcaoCondicao> = {
  inserir: { rotulo: "Inserir condição Gestante", variant: "secondary" },
  remover: { rotulo: "Remover condição Gestante", variant: "destructive" },
  nenhuma_acao: { rotulo: "Nenhuma ação", variant: "outline" },
  revisar_cadastro: { rotulo: "Revisar cadastro", variant: "secondary" },
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

export function apresentarAcaoCondicao(acao: AcaoCondicaoAutorreferida): ApresentacaoAcaoCondicao {
  return APRESENTACAO_ACAO[acao];
}

export function explicarMotivoCondicao(motivo: MotivoAcaoCondicao): string {
  return MOTIVO_ROTULO[motivo];
}
