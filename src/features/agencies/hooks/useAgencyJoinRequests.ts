import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AgencyInviteCreate,
  AgencyInviteAcceptRequest,
  AgencyInviteAcceptResponse,
  AgencyInviteResponse,
  AgencyJoinRequestCreate,
  AgencyJoinRequestRejectRequest,
  AgencyJoinRequestResponse,
  MyAgencyJoinRequestResponse,
} from "@/types";

export function useCreateAgencyJoinRequest(agencyId: string | number) {
  return useMutation({
    mutationFn: (payload: AgencyJoinRequestCreate) =>
      apiClient<AgencyJoinRequestResponse>(
        `/api/v1/agencies/${agencyId}/join-request/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
  });
}

export function useAgencyJoinRequests(
  agencyId?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyJoinRequests", agencyId],
    queryFn: () =>
      apiClient<AgencyJoinRequestResponse[]>(
        `/api/v1/agencies/${agencyId}/join-requests/?limit=100`,
      ),
    staleTime: 30_000,
    enabled: enabled && Boolean(agencyId),
  });
}

export function useApproveAgencyJoinRequest(agencyId?: string | number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      apiClient<AgencyJoinRequestResponse>(
        `/api/v1/agencies/${agencyId}/join-requests/${requestId}/approve/`,
        { method: "PATCH" },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agencyJoinRequests", agencyId] }),
        queryClient.invalidateQueries({ queryKey: ["agencyAgents", agencyId] }),
      ]);
    },
  });
}

export function useRejectAgencyJoinRequest(agencyId?: string | number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload?: AgencyJoinRequestRejectRequest;
    }) =>
      apiClient<AgencyJoinRequestResponse>(
        `/api/v1/agencies/${agencyId}/join-requests/${requestId}/reject/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload ?? {}),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["agencyJoinRequests", agencyId],
      });
    },
  });
}

export function useInviteAgencyAgent(agencyId?: string | number | null) {
  return useMutation({
    mutationFn: (payload: AgencyInviteCreate) =>
      apiClient<AgencyInviteResponse>(`/api/v1/agencies/${agencyId}/invite/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useAcceptAgencyInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgencyInviteAcceptRequest) =>
      apiClient<AgencyInviteAcceptResponse>("/api/v1/agencies/accept-invite/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["agentProfileByUser"] }),
      ]);
    },
  });
}

export function useMyAgencyJoinRequests(enabled = true) {
  return useQuery({
    queryKey: ["myAgencyJoinRequests"],
    queryFn: () =>
      apiClient<MyAgencyJoinRequestResponse[]>("/api/v1/join-requests/mine/"),
    staleTime: 30_000,
    enabled,
  });
}
