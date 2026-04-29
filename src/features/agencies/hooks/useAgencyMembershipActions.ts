import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AgencyAgentMembershipActionRequest,
  AgencyAgentMembershipResponse,
  AgencyAgentRosterMember,
  AgencyMembershipReviewRequestCreate,
  AgencyMembershipReviewRequestResponse,
} from "@/types";

type MembershipAction = "suspend" | "revoke" | "block";

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

export function useCreateAgencyMembershipReviewRequest(
  agencyId?: string | number | null,
  membershipId?: string | number | null,
) {
  return useMutation({
    mutationFn: (payload: AgencyMembershipReviewRequestCreate) =>
      apiClient<AgencyMembershipReviewRequestResponse>(
        `/api/v1/agencies/${agencyId}/agents/${membershipId}/review-request/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
  });
}
