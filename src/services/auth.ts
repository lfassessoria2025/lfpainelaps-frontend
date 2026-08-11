import { http } from "@/lib/http";
import type { AcceptInvitationRequest, LoginRequest, UserOut } from "@/lib/api-types";

export const authService = {
  login: (payload: LoginRequest) => http.post<UserOut>("/auth/login", payload),
  refresh: () => http.post<UserOut>("/auth/refresh"),
  logout: () => http.post<void>("/auth/logout"),
  me: (signal?: AbortSignal) => http.get<UserOut>("/auth/me", signal),
  acceptInvite: (payload: AcceptInvitationRequest) =>
    http.post<void>("/auth/accept-invite", payload),
};
