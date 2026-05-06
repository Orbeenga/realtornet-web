import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AgencyAgentMembershipActionRequest,
  AgencyAgentMembershipResponse,
  AgencyAgentRosterMember,
  AgencyReviewRequestCreate,
  AgencyReviewRequestDecisionRequest,
  AgencyReviewRequestResponse,
  AgentMembershipAudit,
  MyAgencyMembershipResponse,
  MyAgentMembershipStatusResponse,
} from "@/types";

type MembershipAction = "suspend" | "revoke" | "block" | "restore";

interface MembershipMutationVariables {
  membershipId: number;
  payload: AgencyAgentMembershipActionRequest;
}

function useAgencyMembershipAction(
  agencyId?: string | number | null,
  action?: MembershipAction,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, payload }: MembershipMutationVariables) =>
      apiClient<AgencyAgentMembershipResponse>(
        `/api/v1/agencies/${agencyId}/agents/${membershipId}/${action}/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async (membership) => {
      queryClient.setQueryData<AgencyAgentRosterMember[]>(
        ["agencyAgents", agencyId, "all"],
        (current) =>
          current?.map((agent) =>
            agent.membership_id === membership.membership_id
              ? {
                  ...agent,
                  membership_status: membership.status,
                  status_reason: membership.status_reason,
                  status_decided_at: membership.status_decided_at,
                  status_decided_by: membership.status_decided_by,
                }
              : agent,
          ) ?? current,
      );
      await queryClient.invalidateQueries({ queryKey: ["agencyAgents", agencyId] });
    },
  });
}

export function useSuspendAgencyMembership(agencyId?: string | number | null) {
  return useAgencyMembershipAction(agencyId, "suspend");
}

export function useRevokeAgencyMembership(agencyId?: string | number | null) {
  return useAgencyMembershipAction(agencyId, "revoke");
}

export function useBlockAgencyMembership(agencyId?: string | number | null) {
  return useAgencyMembershipAction(agencyId, "block");
}

export function useRestoreAgencyMembership(agencyId?: string | number | null) {
  return useAgencyMembershipAction(agencyId, "restore");
}

interface ReviewRequestVariables {
  agencyId: string | number;
  payload: AgencyReviewRequestCreate;
}

export function useCreateAgencyReviewRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: ReviewRequestVariables) =>
      apiClient<AgencyReviewRequestResponse>(
        `/api/v1/agencies/${agencyId}/review-requests/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] }),
        queryClient.invalidateQueries({ queryKey: ["membershipHistory"] }),
        queryClient.invalidateQueries({ queryKey: ["agencyReviewRequests"] }),
      ]);
    },
  });
}

export function useAgencyReviewRequests(
  agencyId?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyReviewRequests", agencyId],
    queryFn: () =>
      apiClient<AgencyReviewRequestResponse[]>(
        `/api/v1/agencies/${agencyId}/review-requests/`,
      ),
    staleTime: 30_000,
    enabled: enabled && Boolean(agencyId),
  });
}

function useAgencyReviewRequestDecision(
  agencyId?: string | number | null,
  action?: "accept" | "decline",
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: AgencyReviewRequestDecisionRequest;
    }) =>
      apiClient<AgencyReviewRequestResponse>(
        `/api/v1/agencies/${agencyId}/review-requests/${requestId}/${action}/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async (reviewRequest) => {
      queryClient.setQueryData<AgencyReviewRequestResponse[]>(
        ["agencyReviewRequests", agencyId],
        (current) =>
          current?.map((request) =>
            request.id === reviewRequest.id ? reviewRequest : request,
          ) ?? current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agencyReviewRequests", agencyId] }),
        queryClient.invalidateQueries({ queryKey: ["agencyAgents", agencyId] }),
        queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] }),
        queryClient.invalidateQueries({ queryKey: ["membershipHistory"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    },
  });
}

export function useAcceptAgencyReviewRequest(agencyId?: string | number | null) {
  return useAgencyReviewRequestDecision(agencyId, "accept");
}

export function useDeclineAgencyReviewRequest(agencyId?: string | number | null) {
  return useAgencyReviewRequestDecision(agencyId, "decline");
}

export function useMembershipHistory(enabled = true) {
  return useQuery({
    queryKey: ["membershipHistory", "me"],
    queryFn: () =>
      apiClient<AgentMembershipAudit[]>("/api/v1/users/me/membership-history/"),
    staleTime: 30_000,
    enabled,
  });
}

export function useAgencyMemberHistory(
  agencyId?: string | number | null,
  userId?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyMemberHistory", agencyId, userId],
    queryFn: () =>
      apiClient<AgentMembershipAudit[]>(
        `/api/v1/agencies/${agencyId}/member-history/${userId}/`,
      ),
    staleTime: 30_000,
    enabled: enabled && Boolean(agencyId) && Boolean(userId),
  });
}

export function useLeaveAgencyMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      reason,
    }: {
      membershipId: number;
      reason?: string | null;
    }) =>
      apiClient<MyAgencyMembershipResponse>(
        `/api/v1/agency-memberships/${membershipId}/leave/`,
        {
          method: "PATCH",
          body: JSON.stringify({ reason: reason ?? null }),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] }),
        queryClient.invalidateQueries({ queryKey: ["membershipHistory"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    },
  });
}

export function useAgentMembershipStatus(enabled = true) {
  return useQuery({
    queryKey: ["agentMembershipStatus"],
    queryFn: () =>
      apiClient<MyAgentMembershipStatusResponse>("/api/v1/agency-memberships/me/status"),
    staleTime: 30_000,
    enabled,
    retry: false,
  });
}

export function useMyAgencyMemberships(enabled = true) {
  return useQuery({
    queryKey: ["myAgencyMemberships"],
    queryFn: () =>
      apiClient<MyAgencyMembershipResponse[]>("/api/v1/agency-memberships/mine/"),
    staleTime: 30_000,
    enabled,
  });
}
