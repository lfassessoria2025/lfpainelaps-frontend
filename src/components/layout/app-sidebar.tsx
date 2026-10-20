import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Permission } from "@/lib/api-types";
import { temPermissao } from "@/lib/permissions";
import {
  ADMIN_NAVIGATION_ITEMS,
  ANALYTICS_PERMISSIONS,
  DATA_NAVIGATION_ITEMS,
  INDICATORS_PAGE_ITEM,
} from "@/lib/navigation";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission | Permission[];
  anyPermission?: Permission[];
}

const PAINEL_ITEM: NavItem = { to: "/", label: "Painel", icon: LayoutDashboard };

const INDICADORES_ITEMS: NavItem[] = [{ ...INDICATORS_PAGE_ITEM, label: INDICATORS_PAGE_ITEM.title }];
const ADMINISTRATIVO_ITEMS: NavItem[] = ADMIN_NAVIGATION_ITEMS;
const DADOS_ITEMS: NavItem[] = DATA_NAVIGATION_ITEMS.map((item) => ({
  ...item,
  anyPermission: item.anyPermission ?? ANALYTICS_PERMISSIONS,
}));

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
  const { state } = useSidebar();
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
          <SidebarTrigger
            className="ml-auto text-sidebar-foreground/70 group-data-[collapsible=icon]:mx-auto"
            aria-label={state === "expanded" ? "Recolher menu lateral" : "Expandir menu lateral"}
            title={state === "expanded" ? "Recolher menu lateral" : "Expandir menu lateral"}
          >
            {state === "expanded" ? <PanelLeftClose /> : <PanelLeftOpen />}
          </SidebarTrigger>
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
