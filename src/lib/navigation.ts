import {
  Activity,
  BarChart3,
  Baby,
  Building2,
  CalendarCheck,
  HeartHandshake,
  HeartPulse,
  Link2,
  PersonStanding,
  ShieldCheck,
  Smile,
  UploadCloud,
  UserCog,
  Users,
  UsersRound,
  Venus,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/api-types";

export interface NavigationShortcut {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  permission: Permission | Permission[];
}

/**
 * Fonte única dos indicadores exibidos no menu e nas telas de acesso.
 * A autorização continua sendo aplicada por temPermissao no componente que
 * renderiza cada link; este arquivo apenas evita listas divergentes.
 */
export const INDICATOR_SHORTCUTS: NavigationShortcut[] = [
  { to: "/gestantes", title: "Gestantes", description: "Acompanhe pré-natal, consultas e pendências.", icon: HeartHandshake, permission: "relatorio.gestante.visualizar" },
  { to: "/criancas", title: "Crianças", description: "Veja puericultura, vacinas e desenvolvimento.", icon: Baby, permission: "relatorio.crianca.visualizar" },
  { to: "/mulheres", title: "Mulheres", description: "Monitore rastreamentos e cuidado integral.", icon: Venus, permission: "relatorio.mulher.visualizar" },
  { to: "/idosos", title: "Pessoas idosas", description: "Confira acompanhamento, visitas e vacinação.", icon: PersonStanding, permission: "relatorio.idoso.visualizar" },
  { to: "/diabetes", title: "Diabetes", description: "Acompanhe consultas, exames e cuidado completo.", icon: Activity, permission: "relatorio.diabetes.visualizar" },
  { to: "/hipertensao", title: "Hipertensão", description: "Veja pressão, consultas e acompanhamento.", icon: HeartPulse, permission: "relatorio.hipertensao.visualizar" },
  { to: "/saude-bucal", title: "Saúde bucal", description: "Monitore produção, prevenção e equipes.", icon: Smile, permission: "relatorio.saude_bucal.visualizar" },
  { to: "/emulti", title: "eMulti", description: "Consulte ações e atendimentos compartilhados.", icon: UsersRound, permission: "relatorio.emulti.visualizar" },
  { to: "/mais-acesso", title: "Mais acesso APS", description: "Analise demanda programada e atendimentos.", icon: CalendarCheck, permission: "relatorio.c1.visualizar" },
  { to: "/vinculo", title: "Vínculo e acompanhamento", description: "Acompanhe cadastro, vínculo e vulnerabilidades.", icon: Link2, permission: "relatorio.vinculo.visualizar" },
];

export const INDICATOR_PERMISSIONS: Permission[] = INDICATOR_SHORTCUTS.flatMap((item) =>
  Array.isArray(item.permission) ? item.permission : [item.permission],
);

export const ANALYTICS_PERMISSIONS: Permission[] = [
  "relatorio.visualizar",
  ...INDICATOR_PERMISSIONS,
];

/** Atalhos realmente operacionais que permanecem na página inicial. */
export const OPERATION_SHORTCUTS: NavigationShortcut[] = [
  { to: "/analytics", title: "Analytics", description: "Compare resultados, períodos e equipes.", icon: BarChart3, permission: ANALYTICS_PERMISSIONS },
  { to: "/importacoes", title: "Importações", description: "Envie backups e acompanhe o processamento.", icon: UploadCloud, permission: "dump.upload" },
  { to: "/prefeituras", title: "Prefeituras", description: "Gerencie municípios atendidos.", icon: Building2, permission: "prefeitura.gerenciar" },
  { to: "/usuarios", title: "Usuários e convites", description: "Controle cargos, equipes e acessos.", icon: UserCog, permission: "equipe.gerenciar" },
  { to: "/cargos", title: "Cargos e permissões", description: "Configure as capacidades de cada cargo.", icon: ShieldCheck, permission: "cargo.visualizar" },
];

export const INDICATORS_PAGE_ITEM = {
  to: "/indicadores",
  title: "Indicadores",
  description: "Acesse todos os indicadores liberados para seu usuário.",
  icon: BarChart3,
  permission: INDICATOR_PERMISSIONS,
} satisfies NavigationShortcut;

export const DATA_NAVIGATION_ITEMS = [
  { to: "/importacoes", label: "Importações", icon: UploadCloud, permission: "dump.upload" as Permission },
  { to: "/analytics", label: "Analytics", icon: BarChart3, anyPermission: ANALYTICS_PERMISSIONS },
];

export const ADMIN_NAVIGATION_ITEMS = [
  { to: "/prefeituras", label: "Prefeituras", icon: Building2, permission: "prefeitura.gerenciar" as Permission },
  { to: "/cargos", label: "Cargos e permissões", icon: ShieldCheck, permission: "cargo.visualizar" as Permission },
  { to: "/usuarios", label: "Usuários e convites", icon: Users, permission: "equipe.gerenciar" as Permission },
];
