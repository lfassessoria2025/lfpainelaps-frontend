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
  is_admin: boolean;
  status: UserStatus;
}

// app/schemas/users.py — usado na gestão de equipe (GET /users), nunca inclui
// password_hash nem qualquer token.
export interface UserSummaryOut {
  id: number;
  email: string;
  is_admin: boolean;
  status: UserStatus;
  role_id: number | null;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface AcceptInvitationRequest {
  token: string | null;
  senha: string;
}

// ---------------------------------------------------------------------------
// Permissions (app/schemas/permissions.py, app/domain/permissions.py)
// ---------------------------------------------------------------------------

export type Permission =
  | "relatorio.visualizar"
  | "relatorio.baixar"
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

export interface InvitationCreate {
  email: string;
  role_id: number | null;
}

export interface InvitationOut {
  user_id: number;
  token: string;
}

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

// ---------------------------------------------------------------------------
// Erro padronizado da API (FastAPI HTTPException)
// ---------------------------------------------------------------------------

/** Corpo de erro de qualquer resposta 4xx/5xx do FastAPI. */
export interface ApiErrorBody {
  detail: string;
}
