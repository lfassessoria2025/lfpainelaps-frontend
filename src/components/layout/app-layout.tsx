import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppTopbar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
          {/* `key` no pathname força o React a remontar a cada troca de rota,
              o que reinicia a animação de entrada — é assim que uma
              transição "premium" de página funciona sem lib de animação
              (tw-animate-css, já instalado; ver FLO-33). */}
          <div
            key={location.pathname}
            className="animate-in min-w-0 fade-in slide-in-from-bottom-2 duration-500 ease-out"
          >
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
