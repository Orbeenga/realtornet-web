import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Agency,
  AgencyApplicationCreate,
  AgencyApplicationResponse,
  AgencyRejectRequest,
} from "@/types";

interface AgencyDecisionVariables {
  agencyId: number;
  payload: AgencyRejectRequest;
}

export function useApplyForAgency() {
  return useMutation({
    mutationFn: (payload: AgencyApplicationCreate) =>
      apiClient<AgencyApplicationResponse>("/api/v1/agencies/apply/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useAdminAgencies(
  status: "pending" | "approved" | "rejected" = "pending",
  enabled = true,
) {
  return useQuery({
    queryKey: ["adminAgencies", status],
    queryFn: () =>
      apiClient<Agency[]>(
        `/api/v1/admin/agencies/?status=${encodeURIComponent(status)}&limit=100`,
      ),
    staleTime: 30_000,
    enabled,
  });
}

export function useApproveAgencyApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: AgencyDecisionVariables) =>
      apiClient<Agency>(`/api/v1/admin/agencies/${agencyId}/approve/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminAgencies"] }),
        queryClient.invalidateQueries({ queryKey: ["agencies"] }),
      ]);
    },
  });
}

export function useRejectAgencyApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: AgencyDecisionVariables) =>
      apiClient<Agency>(`/api/v1/admin/agencies/${agencyId}/reject/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminAgencies"] }),
        queryClient.invalidateQueries({ queryKey: ["agencies"] }),
      ]);
    },
  });
}

export function useRevokeAgencyApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: AgencyDecisionVariables) =>
      apiClient<Agency>(`/api/v1/admin/agencies/${agencyId}/revoke/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminAgencies"] }),
        queryClient.invalidateQueries({ queryKey: ["agencies"] }),
      ]);
    },
  });
}

export function useSuspendAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: AgencyDecisionVariables) =>
      apiClient<Agency>(`/api/v1/admin/agencies/${agencyId}/suspend/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminAgencies"] }),
        queryClient.invalidateQueries({ queryKey: ["agencies"] }),
      ]);
    },
  });
}
