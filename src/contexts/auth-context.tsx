import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/http";
import { authService } from "@/services/auth";
import type { LoginRequest, UserOut } from "@/lib/api-types";

interface AuthContextValue {
  /** `undefined` enquanto o bootstrap (`GET /auth/me`) ainda não respondeu. */
  user: UserOut | null | undefined;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null | undefined>(undefined);

  const bootstrap = useCallback(async () => {
    try {
      const currentUser = await authService.me();
      setUser(currentUser);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }
      // Falha de rede/servidor: trata como sessão ausente para não travar a UI
      // num loading infinito; o usuário pode tentar login manualmente.
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (payload: LoginRequest) => {
    const loggedUser = await authService.login(payload);
    setUser(loggedUser);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, refreshUser: bootstrap }),
    [user, login, logout, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider.");
  }
  return context;
}
