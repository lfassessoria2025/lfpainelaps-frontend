import { http } from "@/lib/http";
import type {
  InvitationCreate,
  InvitationOut,
  RoleAssignment,
  UserManagementUpdate,
  UserSummaryOut,
  UserStatusChange,
} from "@/lib/api-types";

export const usersService = {
  list: (signal?: AbortSignal) => http.get<UserSummaryOut[]>("/users", signal),
  invite: (payload: InvitationCreate) => http.post<InvitationOut>("/users/invitations", payload),
  assignRole: (userId: number, payload: RoleAssignment) =>
    http.put<void>(`/users/${userId}/role`, payload),
  update: (userId: number, payload: UserManagementUpdate) =>
    http.patch<UserSummaryOut>(`/users/${userId}`, payload),
  deactivate: (userId: number, payload: UserStatusChange) =>
    http.post<void>(`/users/${userId}/deactivate`, payload),
  reactivate: (userId: number, payload: UserStatusChange) =>
    http.post<void>(`/users/${userId}/reactivate`, payload),
  cancelInvitation: (userId: number, payload: UserStatusChange) =>
    http.post<void>(`/users/${userId}/cancel-invitation`, payload),
};
