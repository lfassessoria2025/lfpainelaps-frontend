import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Spinner } from "@/components/ui/spinner";

// Cada página vira um chunk separado, carregado sob demanda ao navegar —
// evita que o bundle inicial carregue telas de RBAC/prefeituras/importações
// antes de o usuário sequer estar autenticado.
const LoginPage = lazy(() => import("@/pages/login-page").then((m) => ({ default: m.LoginPage })));
const AcceptInvitePage = lazy(() =>
  import("@/pages/accept-invite-page").then((m) => ({ default: m.AcceptInvitePage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })),
);
const RolesPage = lazy(() => import("@/pages/roles-page").then((m) => ({ default: m.RolesPage })));
const PrefeiturasPage = lazy(() =>
  import("@/pages/prefeituras-page").then((m) => ({ default: m.PrefeiturasPage })),
);
const ImportacoesPage = lazy(() =>
  import("@/pages/importacoes-page").then((m) => ({ default: m.ImportacoesPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found-page").then((m) => ({ default: m.NotFoundPage })),
);

function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cargos" element={<RolesPage />} />
            <Route path="/prefeituras" element={<PrefeiturasPage />} />
            <Route path="/importacoes" element={<ImportacoesPage />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
