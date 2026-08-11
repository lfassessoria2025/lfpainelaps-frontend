import { http } from "@/lib/http";
import type {
  PrefeituraCreate,
  PrefeituraMembers,
  PrefeituraOut,
  PrefeituraUpdate,
} from "@/lib/api-types";

export const prefeiturasService = {
  list: (signal?: AbortSignal) => http.get<PrefeituraOut[]>("/prefeituras", signal),
  get: (id: number, signal?: AbortSignal) => http.get<PrefeituraOut>(`/prefeituras/${id}`, signal),
  create: (payload: PrefeituraCreate) => http.post<PrefeituraOut>("/prefeituras", payload),
  update: (id: number, payload: PrefeituraUpdate) =>
    http.put<PrefeituraOut>(`/prefeituras/${id}`, payload),
  activate: (id: number) => http.post<void>(`/prefeituras/${id}/activate`),
  deactivate: (id: number) => http.post<void>(`/prefeituras/${id}/deactivate`),
  setMembers: (userId: number, payload: PrefeituraMembers) =>
    http.put<void>(`/prefeituras/users/${userId}`, payload),
};
