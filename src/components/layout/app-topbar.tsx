import { LogOut, UserCog, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export function AppTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast.error("Não foi possível sair. Tente novamente.");
    }
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm text-foreground sm:inline">{user?.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <UserIcon className="size-3.5" /> {user?.email}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.is_admin ? "Administrador" : "Funcionário"}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/perfil")}>
                <UserCog data-icon="inline-start" />
                Editar perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut data-icon="inline-start" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
