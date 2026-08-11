import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";

/**
 * Guarda de rota: só decide navegação com base no que o backend já respondeu
 * em `GET /auth/me` (401 => sem sessão). Nenhuma regra de autorização aqui,
 * apenas "tem sessão ou não" — RBAC fino continua sendo aplicado pela API.
 */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
