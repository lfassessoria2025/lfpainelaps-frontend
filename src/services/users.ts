import { http } from "@/lib/http";
import type { InvitationCreate, InvitationOut, RoleAssignment } from "@/lib/api-types";

export const usersService = {
  invite: (payload: InvitationCreate) => http.post<InvitationOut>("/users/invitations", payload),
  assignRole: (userId: number, payload: RoleAssignment) =>
    http.put<void>(`/users/${userId}/role`, payload),
};
