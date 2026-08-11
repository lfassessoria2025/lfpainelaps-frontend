import { http } from "@/lib/http";
import type {
  InvitationCreate,
  InvitationOut,
  RoleAssignment,
  UserSummaryOut,
} from "@/lib/api-types";

export const usersService = {
  list: (signal?: AbortSignal) => http.get<UserSummaryOut[]>("/users", signal),
  invite: (payload: InvitationCreate) => http.post<InvitationOut>("/users/invitations", payload),
  assignRole: (userId: number, payload: RoleAssignment) =>
    http.put<void>(`/users/${userId}/role`, payload),
};
