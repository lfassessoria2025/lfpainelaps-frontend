import type { Permission } from "@/lib/api-types";

/** Rótulos e agrupamento de exibição do catálogo fixo de permissões. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "relatorio.visualizar": "Visualizar relatórios",
  "relatorio.baixar": "Baixar relatórios",
  "relatorio.gestante.visualizar": "Visualizar indicador de gestantes (C3)",
  "dump.upload": "Enviar backup (dump)",
  "cargo.criar": "Criar cargos",
  "cargo.editar": "Editar cargos",
  "cargo.excluir": "Excluir cargos",
  "cargo.visualizar": "Visualizar cargos",
  "equipe.gerenciar": "Gerenciar equipe",
  "prefeitura.gerenciar": "Gerenciar prefeituras",
  "prefeitura.atribuir": "Atribuir prefeituras a usuários",
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Relatórios",
    permissions: ["relatorio.visualizar", "relatorio.baixar", "relatorio.gestante.visualizar"],
  },
  { label: "Importações", permissions: ["dump.upload"] },
  {
    label: "Cargos",
    permissions: ["cargo.visualizar", "cargo.criar", "cargo.editar", "cargo.excluir"],
  },
  { label: "Equipe", permissions: ["equipe.gerenciar"] },
  {
    label: "Prefeituras",
    permissions: ["prefeitura.gerenciar", "prefeitura.atribuir"],
  },
];
