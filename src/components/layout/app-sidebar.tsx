import { Baby, BarChart3, Building2, LayoutDashboard, ShieldCheck, UploadCloud } from "lucide-react";
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

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const PAINEL_ITEM: NavItem = { to: "/", label: "Painel", icon: LayoutDashboard };

// Indicadores: só Gestantes (C3) hoje — grupo já nasce pronto pra receber
// C4/C5/etc quando existirem, sem precisar reestruturar a sidebar de novo.
const INDICADORES_ITEMS: NavItem[] = [{ to: "/gestantes", label: "Gestantes", icon: Baby }];

const ADMINISTRATIVO_ITEMS: NavItem[] = [
  { to: "/prefeituras", label: "Prefeituras", icon: Building2 },
  { to: "/cargos", label: "Cargos e permissões", icon: ShieldCheck },
];

const DADOS_ITEMS: NavItem[] = [
  { to: "/importacoes", label: "Importações", icon: UploadCloud },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
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
        {GRUPOS.map((grupo) => (
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
