import { http } from "@/lib/http";
import type { PermissionCatalogOut, RoleCreate, RoleOut, RoleUpdate } from "@/lib/api-types";

export const rolesService = {
  list: (signal?: AbortSignal) => http.get<RoleOut[]>("/roles", signal),
  get: (id: number, signal?: AbortSignal) => http.get<RoleOut>(`/roles/${id}`, signal),
  create: (payload: RoleCreate) => http.post<RoleOut>("/roles", payload),
  update: (id: number, payload: RoleUpdate) => http.put<RoleOut>(`/roles/${id}`, payload),
  remove: (id: number) => http.delete<void>(`/roles/${id}`),
};

export const permissionsService = {
  catalog: (signal?: AbortSignal) => http.get<PermissionCatalogOut>("/permissions", signal),
};
