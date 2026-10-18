import { Accessibility, Activity, Baby, BarChart3, Blocks, Building2, HeartPulse, LayoutDashboard, ShieldCheck, Smile, UploadCloud, Venus, UsersRound, CalendarCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Permission } from "@/lib/api-types";
import { temPermissao } from "@/lib/permissions";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  anyPermission?: Permission[];
}

const PAINEL_ITEM: NavItem = { to: "/", label: "Painel", icon: LayoutDashboard };

const INDICADORES_ITEMS: NavItem[] = [
  { to: "/gestantes", label: "Gestantes", icon: Baby, permission: "relatorio.gestante.visualizar" },
  { to: "/criancas", label: "Crianças", icon: Blocks, permission: "relatorio.crianca.visualizar" },
  { to: "/mulheres", label: "Mulheres", icon: Venus, permission: "relatorio.mulher.visualizar" },
  { to: "/idosos", label: "Pessoas idosas", icon: Accessibility, permission: "relatorio.idoso.visualizar" },
  { to: "/diabetes", label: "Diabetes", icon: Activity, permission: "relatorio.diabetes.visualizar" },
  { to: "/hipertensao", label: "Hipertensão", icon: HeartPulse, permission: "relatorio.hipertensao.visualizar" },
  { to: "/saude-bucal", label: "Saúde bucal", icon: Smile, permission: "relatorio.saude_bucal.visualizar" },
  { to: "/emulti", label: "eMulti", icon: UsersRound, permission: "relatorio.emulti.visualizar" },
  { to: "/mais-acesso", label: "Mais acesso APS", icon: CalendarCheck, permission: "relatorio.c1.visualizar" },
];

const ADMINISTRATIVO_ITEMS: NavItem[] = [
  { to: "/prefeituras", label: "Prefeituras", icon: Building2, permission: "prefeitura.gerenciar" },
  { to: "/cargos", label: "Cargos e permissões", icon: ShieldCheck, permission: "cargo.visualizar" },
];

const DADOS_ITEMS: NavItem[] = [
  { to: "/importacoes", label: "Importações", icon: UploadCloud, permission: "dump.upload" },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    anyPermission: [
      "relatorio.visualizar",
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
];

const GRUPOS: { label: string; items: NavItem[] }[] = [
  { label: "Indicadores", items: INDICADORES_ITEMS },
  { label: "Administrativo", items: ADMINISTRATIVO_ITEMS },
  { label: "Dados", items: DADOS_ITEMS },
];

function isItemAtivo(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function NavItemButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        className={cn(isActive && "font-medium")}
        render={<NavLink to={item.to} />}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const gruposVisiveis = GRUPOS.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => temPermissao(user, item.permission ?? item.anyPermission)),
  })).filter((grupo) => grupo.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
            AP
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">Painel APS</span>
            <span className="text-xs text-sidebar-foreground/60">Dados de saúde</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItemButton
                item={PAINEL_ITEM}
                isActive={isItemAtivo(location.pathname, PAINEL_ITEM.to)}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {gruposVisiveis.map((grupo) => (
          <SidebarGroup key={grupo.label}>
            <SidebarGroupLabel>{grupo.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.items.map((item) => (
                  <NavItemButton
                    key={item.to}
                    item={item}
                    isActive={isItemAtivo(location.pathname, item.to)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
