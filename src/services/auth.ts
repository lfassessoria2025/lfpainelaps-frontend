import { http } from "@/lib/http";
import type {
  AcceptInvitationRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserOut,
} from "@/lib/api-types";

export const authService = {
  login: (payload: LoginRequest) => http.post<UserOut>("/auth/login", payload),
  refresh: () => http.post<UserOut>("/auth/refresh"),
  logout: () => http.post<void>("/auth/logout"),
  me: (signal?: AbortSignal) => http.get<UserOut>("/auth/me", signal),
  acceptInvite: (payload: AcceptInvitationRequest) =>
    http.post<void>("/auth/accept-invite", payload),
  forgotPassword: (payload: ForgotPasswordRequest) =>
    http.post<{ detail: string }>("/auth/esqueci-senha", payload),
  resetPassword: (payload: ResetPasswordRequest) =>
    http.post<UserOut>("/auth/redefinir-senha", payload),
  updateProfile: (payload: UpdateProfileRequest) =>
    http.patch<UserOut>("/auth/me", payload),
  changePassword: (payload: ChangePasswordRequest) =>
    http.post<UserOut>("/auth/me/trocar-senha", payload),
};
