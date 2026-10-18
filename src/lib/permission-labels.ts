import type { Permission } from "@/lib/api-types";

/** Rótulos e agrupamento de exibição do catálogo fixo de permissões. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "relatorio.visualizar": "Visualizar relatórios",
  "relatorio.baixar": "Baixar relatórios",
  "relatorio.gestante.visualizar": "Visualizar indicador de gestantes (C3)",
  "relatorio.crianca.visualizar": "Visualizar indicador de crianças (C2)",
  "relatorio.mulher.visualizar": "Visualizar indicador de mulheres (C7)",
  "relatorio.idoso.visualizar": "Visualizar indicador de pessoas idosas (C6)",
  "relatorio.diabetes.visualizar": "Visualizar indicador de diabetes (C4)",
  "relatorio.hipertensao.visualizar": "Visualizar indicador de hipertensão (C5)",
  "relatorio.saude_bucal.visualizar": "Visualizar indicadores de saúde bucal (B1–B6)",
  "relatorio.emulti.visualizar": "Visualizar indicador da eMulti (M1)",
  "relatorio.c1.visualizar": "Visualizar indicador Mais acesso à APS (C1)",
  "relatorio.vinculo.visualizar": "Visualizar indicador de vínculo e acompanhamento (V1)",
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
    permissions: [
      "relatorio.visualizar",
      "relatorio.baixar",
      "relatorio.gestante.visualizar",
      "relatorio.crianca.visualizar",
      "relatorio.mulher.visualizar",
      "relatorio.idoso.visualizar",
      "relatorio.diabetes.visualizar",
      "relatorio.hipertensao.visualizar",
      "relatorio.saude_bucal.visualizar",
      "relatorio.emulti.visualizar",
      "relatorio.c1.visualizar",
      "relatorio.vinculo.visualizar",
    ],
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
