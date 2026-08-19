import { http } from "@/lib/http";
import type {
  AcceptedResponsibilityTermCopyOut,
  ResponsibilityTermAcceptance,
  ResponsibilityTermOut,
} from "@/lib/api-types";

export const responsibilityTermsService = {
  current: (signal?: AbortSignal) =>
    http.get<ResponsibilityTermOut>("/responsibility-terms/current", signal),
  acceptCurrent: (payload: ResponsibilityTermAcceptance) =>
    http.post<void>("/responsibility-terms/current/acceptance", payload),
  acceptedCopy: (termId: number, signal?: AbortSignal) =>
    http.get<AcceptedResponsibilityTermCopyOut>(
      `/responsibility-terms/${termId}/accepted-copy`,
      signal,
    ),
};
