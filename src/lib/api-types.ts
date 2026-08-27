/**
 * Tipos do contrato HTTP do backend (FastAPI). Espelham 1:1 os schemas Pydantic
 * em `saude-backend/app/schemas/*.py` — não inventar campo que não exista lá.
 * Este arquivo é só forma de dado; nenhuma regra de negócio ou autorização aqui.
 */

// ---------------------------------------------------------------------------
// Auth (app/schemas/auth.py)
// ---------------------------------------------------------------------------

export type UserStatus = "convidado" | "ativo" | "desativado";

export interface UserOut {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  status: UserStatus;
  /** Capacidades efetivas calculadas pelo backend; serve apenas para adaptar a UI. */
  permissions: Permission[];
}

// app/schemas/users.py — usado na gestão de equipe (GET /users), nunca inclui
// password_hash nem qualquer token.
export interface UserSummaryOut {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  status: UserStatus;
  role_id: number | null;
  prefeitura_ids: number[];
  current_term_version: string | null;
  current_term_accepted_at: string | null;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface AcceptInvitationRequest {
  token: string | null;
  senha: string;
  term_id: number;
  term_content_sha256: string;
  term_acknowledged: true;
}

export interface InvitationTermRequest {
  token: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string | null;
  senha: string;
}

// Edição do próprio perfil (PATCH /auth/me e POST /auth/me/trocar-senha).
export interface UpdateProfileRequest {
  name: string;
}

export interface ChangePasswordRequest {
  senha_atual: string;
  senha_nova: string;
}

// ---------------------------------------------------------------------------
// Permissions (app/schemas/permissions.py, app/domain/permissions.py)
// ---------------------------------------------------------------------------

export type Permission =
  | "relatorio.visualizar"
  | "relatorio.baixar"
  | "relatorio.gestante.visualizar"
  | "dump.upload"
  | "cargo.criar"
  | "cargo.editar"
  | "cargo.excluir"
  | "cargo.visualizar"
  | "equipe.gerenciar"
  | "prefeitura.gerenciar"
  | "prefeitura.atribuir";

export interface PermissionCatalogOut {
  permissions: Permission[];
}

// ---------------------------------------------------------------------------
// Roles (app/schemas/roles.py)
// ---------------------------------------------------------------------------

export interface RoleOut {
  id: number;
  name: string;
  permissions: Permission[];
}

export interface RoleCreate {
  name: string;
  permissions: Permission[];
}

export type RoleUpdate = RoleCreate;

// ---------------------------------------------------------------------------
// Users / convites (app/schemas/users.py)
// ---------------------------------------------------------------------------

export interface RoleAssignment {
  role_id: number | null;
}

export interface UserManagementUpdate {
  name?: string | null;
  role_id?: number | null;
  prefeitura_ids?: number[];
  motivo: string;
}

export interface UserStatusChange {
  motivo: string;
}

export interface InvitationCreate {
  email: string;
  role_id: number | null;
}

export interface InvitationOut {
  user_id: number;
  token: string;
}

// ---------------------------------------------------------------------------
// Termo de responsabilidade e sigilo
// ---------------------------------------------------------------------------

export interface ResponsibilityTermOut {
  id: number;
  version: string;
  title: string;
  content: string;
  content_sha256: string;
  effective_at: string;
  accepted: boolean;
}

export interface ResponsibilityTermAcceptance {
  term_id: number;
  content_sha256: string;
  acknowledged: true;
}

export type AcceptedResponsibilityTermCopyOut = Omit<ResponsibilityTermOut, "accepted"> & {
  accepted_at: string;
};

// ---------------------------------------------------------------------------
// Prefeituras (app/schemas/prefeituras.py)
// ---------------------------------------------------------------------------

export interface PrefeituraOut {
  id: number;
  ibge_code: string;
  name: string;
  active: boolean;
}

export interface PrefeituraCreate {
  ibge_code: string;
  name: string;
}

export interface PrefeituraUpdate {
  name: string;
}

export interface PrefeituraMembers {
  prefeitura_ids: number[];
}

// ---------------------------------------------------------------------------
// Importações (app/schemas/importacoes.py, app/domain/importacao.py)
// ---------------------------------------------------------------------------

/** Máquina de estados da importação — ordem reflete o fluxo esperado. */
export type ImportacaoStatus =
  | "aguardando_upload"
  | "recebido"
  | "validando"
  | "pronto_para_restaurar"
  | "restaurando"
  | "staging_preflight_validado"
  | "validando_arquivo"
  | "arquivo_validado"
  | "restaurando_arquivo"
  | "staging_restaurado"
  | "extraindo"
  | "concluido"
  | "falhou"
  | "expirado";

/** Status que indicam processamento em andamento (front pode fazer polling). */
export const IMPORTACAO_STATUS_EM_ANDAMENTO: ReadonlySet<ImportacaoStatus> = new Set([
  "recebido",
  "validando",
  "restaurando",
  "staging_preflight_validado",
  "validando_arquivo",
  "arquivo_validado",
  "restaurando_arquivo",
  "staging_restaurado",
  "extraindo",
]);

export const IMPORTACAO_STATUS_TERMINAL: ReadonlySet<ImportacaoStatus> = new Set([
  "concluido",
  "falhou",
  "expirado",
]);

export interface ImportacaoOut {
  id: string; // UUID (public_id)
  status: ImportacaoStatus;
  display_name: string;
  expected_size_bytes: number;
  created_at: string; // ISO datetime
  last_failure_code: string | null;
}

export interface ImportacaoCreate {
  display_name: string;
  expected_size_bytes: number;
}

export interface UploadInstructionsOut {
  url: string;
  method: string;
  headers: Record<string, string>;
  expires_at: string; // ISO datetime
}

/** Contrato de upload multipart. O servidor é a fonte de verdade para as
 * partes concluídas; o navegador nunca persiste URLs pré-assinadas. */
export interface MultipartSessionOut {
  part_size_bytes: number;
  total_parts: number;
  uploaded_parts: number[];
}

export interface MultipartPartOut extends UploadInstructionsOut {
  part_number: number;
}

export interface MultipartCompletePart {
  part_number: number;
  etag: string;
}

// ---------------------------------------------------------------------------
// Indicador C3 — gestante/puerpério (app/schemas/gestante.py)
// ---------------------------------------------------------------------------

export type AcaoCondicaoAutorreferida =
  | "inserir"
  | "remover"
  | "nenhuma_acao"
  | "revisar_cadastro";

export type MotivoAcaoCondicao =
  | "dados_legados_sem_avaliacao"
  | "cadastro_coerente"
  | "condicao_nao_marcada"
  | "condicao_ainda_marcada"
  | "cadastro_ausente_ou_nao_informado"
  | "estado_esperado_indeterminado"
  | "registro_historico";

export interface GestanteAcompanhamentoOut {
  id: number;
  nome_cidadao: string;
  data_nascimento: string | null; // ISO date
  equipe_nome: string | null;
  equipe_ine: string | null;
  micro_area: string | null;
  dt_inicio_gestacao: string; // ISO date
  dt_fim_gestacao: string; // ISO date
  dt_fim_puerperio: string; // ISO date
  excluida_por_aborto: boolean;
  pratica_a_captacao_precoce: boolean;
  pratica_b_consultas: number;
  pratica_c_pressao: number;
  pratica_d_peso_altura: number;
  pratica_e_vd_gestacao: number;
  pratica_f_vacina_dtpa: boolean;
  pratica_g_exames_1t: boolean;
  pratica_h_exames_3t: boolean;
  pratica_k_saude_bucal: boolean;
  pratica_i_consulta_puerperio: boolean;
  pratica_j_vd_puerperio: boolean;
  pontuacao_total: number;
  condicao_gestante_acao: AcaoCondicaoAutorreferida;
  condicao_gestante_motivo: MotivoAcaoCondicao;
  condicao_gestante_data_referencia: string | null; // ISO date do dump
  created_at: string; // ISO datetime
}

export interface EquipeGestanteOut {
  chave: string;
  nome: string | null;
  ine: string | null;
  total_gestantes: number;
  sem_equipe: boolean;
}

export interface MicroAreaGestanteOut {
  chave: string;
  codigo: string | null;
  total_gestantes: number;
  sem_micro_area: boolean;
}

// Agregado sem dado nominal (app/schemas/gestante.py: MetricaPraticaOut/MetricasIndicadorOut)
// — usado pela aba de Analytics, nunca traz nome/data de nascimento individual.
export interface MetricaPraticaOut {
  pratica: string;
  titulo: string;
  total_gestantes: number;
  total_cumprida: number;
  percentual_cumprido: number;
}

export interface MetricasIndicadorOut {
  prefeitura_id: number;
  prefeitura_nome: string;
  total_gestantes: number;
  praticas: MetricaPraticaOut[];
}

export interface SerieHistoricaPontoOut {
  importacao_id: number;
  data_referencia: string;
  total_gestantes: number;
  praticas: MetricaPraticaOut[];
}

export type TipoParametroIndicador = "booleano" | "contagem";
export type DimensaoComparacaoIndicador = "prefeitura" | "periodo" | "parametro";
export type VisualizacaoIndicador = "barra" | "pizza" | "radar" | "ranking" | "evolucao";

export interface ParametroIndicadorCatalogoOut {
  codigo: string;
  rotulo: string;
  descricao: string;
  tipo: TipoParametroIndicador;
  meta: number | null;
  filtravel: boolean;
  ordenavel: boolean;
}

export interface IndicadorCatalogoOut {
  codigo: string;
  nome: string;
  categoria: string;
  descricao: string;
  permissao: string;
  parametros: ParametroIndicadorCatalogoOut[];
  dimensoes_comparacao: DimensaoComparacaoIndicador[];
  visualizacoes: VisualizacaoIndicador[];
  possui_historico: boolean;
  granularidade_historico: "importacao" | null;
  possui_lista_nominal: boolean;
}

export interface IndicadoresCatalogoOut {
  indicadores: IndicadorCatalogoOut[];
}

// ---------------------------------------------------------------------------
// Erro padronizado da API (FastAPI HTTPException)
// ---------------------------------------------------------------------------

/** Corpo de erro de qualquer resposta 4xx/5xx do FastAPI. */
export interface ApiErrorBody {
  detail: string;
}
