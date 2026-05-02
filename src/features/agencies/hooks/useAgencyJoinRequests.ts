import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AgencyInviteCreate,
  AgencyInviteAcceptRequest,
  AgencyInviteAcceptResponse,
  AgencyInvitationResponse,
  AgencyInviteResponse,
  AgencyJoinRequestCreate,
  AgencyJoinRequestRejectRequest,
  AgencyJoinRequestResponse,
  MyAgencyJoinRequestResponse,
} from "@/types";

export function useCreateAgencyJoinRequest(agencyId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgencyJoinRequestCreate) =>
      apiClient<AgencyJoinRequestResponse>(
        `/api/v1/agencies/${agencyId}/join-request/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["myAgencyJoinRequests"] });
    },
  });
}

export function useAgencyJoinRequests(
  agencyId?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyJoinRequests", agencyId, "all"],
    queryFn: () =>
      apiClient<AgencyJoinRequestResponse[]>(
        `/api/v1/agencies/${agencyId}/join-requests/?status=all&limit=100`,
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
    onSuccess: async (_data, requestId) => {
      queryClient.setQueryData<AgencyJoinRequestResponse[]>(
        ["agencyJoinRequests", agencyId, "all"],
        (current) =>
          current?.map((request) =>
            request.join_request_id === requestId
              ? { ...request, ..._data }
              : request,
          ) ?? current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agencyAgents", agencyId] }),
        queryClient.invalidateQueries({ queryKey: ["myAgencyJoinRequests"] }),
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
      payload: AgencyJoinRequestRejectRequest;
    }) =>
      apiClient<AgencyJoinRequestResponse>(
        `/api/v1/agencies/${agencyId}/join-requests/${requestId}/reject/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData<AgencyJoinRequestResponse[]>(
        ["agencyJoinRequests", agencyId, "all"],
        (current) =>
          current?.map((request) =>
            request.join_request_id === variables.requestId
              ? {
                  ...request,
                  ..._data,
                }
              : request,
          ) ?? current,
      );
      await queryClient.invalidateQueries({ queryKey: ["myAgencyJoinRequests"] });
    },
  });
}

export function useInviteAgencyAgent(agencyId?: string | number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgencyInviteCreate) =>
      apiClient<AgencyInviteResponse>(`/api/v1/agencies/${agencyId}/invite/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agencyInvitations", agencyId] });
    },
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

export function useAgencyInvitations(
  agencyId?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyInvitations", agencyId],
    queryFn: () =>
      apiClient<AgencyInvitationResponse[]>(
        `/api/v1/agencies/${agencyId}/invitations/?limit=100`,
      ),
    staleTime: 30_000,
    enabled: enabled && Boolean(agencyId),
  });
}

export function useMyAgencyInvitations(enabled = true) {
  return useQuery({
    queryKey: ["myAgencyInvitations"],
    queryFn: () =>
      apiClient<AgencyInvitationResponse[]>("/api/v1/agency-invitations/mine/"),
    staleTime: 30_000,
    enabled,
  });
}

export function useAcceptAgencyInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) =>
      apiClient<AgencyInviteAcceptResponse>(
        `/api/v1/agency-invitations/${invitationId}/accept/`,
        { method: "PATCH" },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myAgencyInvitations"] }),
        queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["agentProfileByUser"] }),
      ]);
    },
  });
}

export function useRejectAgencyInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) =>
      apiClient<AgencyInvitationResponse>(
        `/api/v1/agency-invitations/${invitationId}/reject/`,
        { method: "PATCH" },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["myAgencyInvitations"] });
    },
  });
}
