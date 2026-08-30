import type { ImportacaoStatus } from "@/lib/api-types";

/** Rótulo e variante de badge por status — só apresentação, sem regra de negócio. */
export const IMPORTACAO_STATUS_INFO: Record<
  ImportacaoStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  aguardando_upload: { label: "Aguardando envio do arquivo", variant: "outline" },
  recebido: { label: "Arquivo recebido", variant: "secondary" },
  validando: { label: "Validando", variant: "secondary" },
  pronto_para_restaurar: { label: "Pronto para restaurar", variant: "secondary" },
  restaurando: { label: "Restaurando", variant: "secondary" },
  staging_preflight_validado: { label: "Pré-validação concluída", variant: "secondary" },
  validando_arquivo: { label: "Validando arquivo", variant: "secondary" },
  arquivo_validado: { label: "Arquivo validado", variant: "secondary" },
  restaurando_arquivo: { label: "Restaurando arquivo", variant: "secondary" },
  staging_restaurado: { label: "Staging restaurado", variant: "secondary" },
  extraindo: { label: "Extraindo dados", variant: "secondary" },
  concluido: { label: "Concluído", variant: "default" },
  substituido: { label: "Substituído por importação mais recente", variant: "outline" },
  falhou: { label: "Falhou", variant: "destructive" },
  expirado: { label: "Expirado", variant: "destructive" },
};

/** Espelha `_EXCLUIVEIS` em app/usecases/importacoes.py — nunca em
 * processamento ativo nem concluído (tem gestante_acompanhamento dependente). */
export const IMPORTACAO_STATUS_EXCLUIVEL = new Set<ImportacaoStatus>([
  "aguardando_upload",
  "falhou",
  "expirado",
]);

/**
 * Explicação legível dos códigos de falha (`last_failure_code`), espelhando a
 * constraint `ck_importacao_failure_code` de `app/models/importacao.py`.
 */
export function explicarFalha(code: string | null): string | null {
  if (!code) return null;
  const explicacoes: Record<string, string> = {
    r2_transient: "Falha temporária de conexão com o armazenamento. Tente novamente.",
    object_absent: "O arquivo enviado não foi encontrado no armazenamento.",
    object_integrity_invalid: "O arquivo enviado está corrompido ou não confere com o esperado.",
    r2_not_configured: "Serviço de armazenamento indisponível no momento.",
    r2_access_denied: "Acesso ao armazenamento negado. Contate o suporte.",
    worker_unexpected: "Erro inesperado no processamento. Contate o suporte.",
    staging_not_configured: "Ambiente de restauração indisponível no momento.",
    staging_invalid: "O ambiente de restauração está em estado inválido.",
    staging_preflight_failed: "A verificação prévia do arquivo falhou.",
    archive_invalid: "O arquivo enviado não é um dump PostgreSQL válido.",
    pg_restore_unavailable: "Ferramenta de restauração indisponível no momento.",
    pg_restore_timeout: "A restauração excedeu o tempo limite.",
    pg_restore_failed: "A restauração do dump falhou.",
    staging_restore_transient: "Falha temporária ao restaurar o arquivo. Tente novamente.",
    staging_busy: "O ambiente de restauração está ocupado com outra importação.",
    extracao_transient: "A leitura do ambiente de restauração oscilou. O sistema tentará novamente automaticamente.",
    extracao_falhou: "A extração não foi concluída. Envie o arquivo novamente.",
  };
  return explicacoes[code] ?? `Falha técnica (código: ${code}). Contate o suporte.`;
}
