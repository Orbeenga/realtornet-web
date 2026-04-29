import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AgencyAgentMembershipActionRequest,
  AgencyAgentMembershipResponse,
  AgencyAgentRosterMember,
  AgencyMembershipReviewDecisionRequest,
  AgencyMembershipReviewRequestCreate,
  AgencyMembershipReviewRequestResponse,
  MyAgencyMembershipResponse,
  MyAgentMembershipStatusResponse,
} from "@/types";

type MembershipAction = "suspend" | "revoke" | "block" | "restore";

interface MembershipMutationVariables {
  membershipId: number;
  payload?: AgencyAgentMembershipActionRequest;
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
          body: JSON.stringify(payload ?? {}),
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

interface ReviewDecisionVariables {
  membershipId: number;
  reviewRequestId: number;
  payload?: AgencyMembershipReviewDecisionRequest;
}

function useAgencyMembershipReviewDecision(
  agencyId?: string | number | null,
  action?: "approve" | "reject",
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      reviewRequestId,
      payload,
    }: ReviewDecisionVariables) =>
      apiClient<AgencyMembershipReviewRequestResponse>(
        `/api/v1/agencies/${agencyId}/agents/${membershipId}/review-requests/${reviewRequestId}/${action}/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload ?? {}),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agencyAgents", agencyId] }),
        queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] }),
      ]);
    },
  });
}

export function useApproveAgencyMembershipReview(
  agencyId?: string | number | null,
) {
  return useAgencyMembershipReviewDecision(agencyId, "approve");
}

export function useRejectAgencyMembershipReview(
  agencyId?: string | number | null,
) {
  return useAgencyMembershipReviewDecision(agencyId, "reject");
}

interface ReviewRequestVariables {
  agencyId: string | number;
  membershipId: string | number;
  payload: AgencyMembershipReviewRequestCreate;
}

export function useCreateAgencyMembershipReviewRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, membershipId, payload }: ReviewRequestVariables) =>
      apiClient<AgencyMembershipReviewRequestResponse>(
        `/api/v1/agencies/${agencyId}/agents/${membershipId}/review-request/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] });
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
