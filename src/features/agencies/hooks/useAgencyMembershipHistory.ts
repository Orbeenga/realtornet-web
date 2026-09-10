import { useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MembershipTimelineEntry, MembershipTimelinePage } from "@/types";

function membershipHistoryUrl(agencyId?: number | null, userId?: number | null, cursor?: string): string {
  const base = `/api/v1/agencies/${agencyId}/membership-history`;
  const params = new URLSearchParams();
  if (userId != null) params.set("user_id", String(userId));
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/* Cursor-paginated membership-history feed (Rule 20: single shared implementation).
   Wraps useInfiniteQuery over the MembershipTimelinePage keyset contract and
   exposes flattened `data` plus explicit "Load more" controls — deliberate
   click-to-reveal for an audit-trail surface, never silent infinite scroll. */
export interface MembershipHistoryFeed {
  data: MembershipTimelineEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  loadMore: () => void;
  hasMore: boolean;
  isFetchingNextPage: boolean;
}

export const MEMBERSHIP_HISTORY_PAGE_SIZE = 20;

/* Transitional contract shim: the deployed backend still returns a bare array;
   the cursor-paginated backend returns {items, next_cursor}. Normalize both so
   the app works before and after the backend deploy. Remove the array branch
   once the paginated contract is live in production. */
export function normalizeMembershipHistoryPage(
  response: MembershipTimelinePage | MembershipTimelineEntry[],
): { items: MembershipTimelineEntry[]; next_cursor: string | null } {
  if (Array.isArray(response)) {
    return { items: response, next_cursor: null };
  }
  return {
    items: response.items ?? [],
    next_cursor: response.next_cursor ?? null,
  };
}

export function useMembershipHistoryFeed(
  buildUrl: (cursor?: string) => string,
  queryKey: readonly unknown[],
  enabled: boolean,
): MembershipHistoryFeed {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      apiClient<MembershipTimelinePage | MembershipTimelineEntry[]>(
        buildUrl(pageParam ?? undefined),
      ).then(normalizeMembershipHistoryPage),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 30_000,
    enabled,
  });
  return {
    data: query.data ? query.data.pages.flatMap((page) => page.items) : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    hasMore: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useAgencyMembershipHistory(
  agencyId?: number | null,
  userId?: number | null,
  enabled = true,
): MembershipHistoryFeed {
  return useMembershipHistoryFeed(
    (cursor) => membershipHistoryUrl(agencyId, userId, cursor),
    ["agencyMembershipHistory", agencyId, userId],
    enabled && Boolean(agencyId),
  );
}

/**
 * Cursor-paginated invitation-events feed (DEF-U-INVITATION-EVENTS-FEED-001).
 * Wraps the canonical useMembershipHistoryFeed over
 * /agency-invitations/{id}/events/ — same MembershipTimelinePage keyset
 * contract, same (timestamp, source_type, id) cursor. One feed per invitation;
 * the Withdrawn-tab cards render the canonical MembershipTimeline rich tier
 * from this feed (accordion + per-invitation "Load more" once expanded).
 */
export function useInvitationEvents(
  invitationId?: number | null,
  enabled = true,
): MembershipHistoryFeed {
  return useMembershipHistoryFeed(
    (cursor) => {
      const base = `/api/v1/agency-invitations/${invitationId}/events/`;
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    },
    ["invitationEvents", invitationId],
    enabled && Boolean(invitationId),
  );
}

/**
 * Batch per-user membership histories for an agency. Keeps the per-user fetch
 * (no cross-user fan-out) while exposing a single data-fetch pattern so callers
 * do not hand-roll `useQueries` + `apiClient`. Result order matches `userIds`.
 * Each query consumes the first cursor page; full-history walking is only for
 * the History tabs (useMembershipHistoryFeed), not these filtered tab views.
 */
export function useAgencyMembershipHistories(
  agencyId?: number | null,
  userIds: Array<number | null | undefined> = [],
  enabled = true,
) {
  return useQueries({
    queries: userIds.map((userId) => ({
      queryKey: ["agencyMembershipHistory", agencyId, userId, "first-page"],
      queryFn: () =>
        apiClient<MembershipTimelinePage | MembershipTimelineEntry[]>(
          membershipHistoryUrl(agencyId, userId),
        ).then(normalizeMembershipHistoryPage).then((page) => page.items),
      staleTime: 30_000,
      enabled: enabled && Boolean(agencyId) && userId != null,
    })),
  });
}
