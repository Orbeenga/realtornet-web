import { useQuery, useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MembershipTimelineEntry } from "@/types";

function membershipHistoryUrl(agencyId?: number | null, userId?: number | null): string {
  const base = `/api/v1/agencies/${agencyId}/membership-history`;
  return userId != null ? `${base}?user_id=${userId}` : base;
}

export function useAgencyMembershipHistory(
  agencyId?: number | null,
  userId?: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyMembershipHistory", agencyId, userId],
    queryFn: () => apiClient<MembershipTimelineEntry[]>(membershipHistoryUrl(agencyId, userId)),
    staleTime: 30_000,
    enabled: enabled && Boolean(agencyId),
  });
}

/**
 * Batch per-user membership histories for an agency. Keeps the per-user fetch
 * (no cross-user fan-out) while exposing a single data-fetch pattern so callers
 * do not hand-roll `useQueries` + `apiClient`. Result order matches `userIds`.
 */
export function useAgencyMembershipHistories(
  agencyId?: number | null,
  userIds: Array<number | null | undefined> = [],
  enabled = true,
) {
  return useQueries({
    queries: userIds.map((userId) => ({
      queryKey: ["agencyMembershipHistory", agencyId, userId],
      queryFn: () => apiClient<MembershipTimelineEntry[]>(membershipHistoryUrl(agencyId, userId)),
      staleTime: 30_000,
      enabled: enabled && Boolean(agencyId) && userId != null,
    })),
  });
}
