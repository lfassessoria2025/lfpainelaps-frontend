import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { AcceptInvitePage } from "@/pages/accept-invite-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { ImportacoesPage } from "@/pages/importacoes-page";
import { LoginPage } from "@/pages/login-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { PrefeiturasPage } from "@/pages/prefeituras-page";
import { RolesPage } from "@/pages/roles-page";

function App() {
  return (
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
  );
}

export default App;
