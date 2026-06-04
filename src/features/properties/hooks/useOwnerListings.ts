import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ModerationStatus, PropertyList } from "@/types";

export function useOwnerListings(
  userId?: string | number,
  moderationStatuses?: ModerationStatus[],
) {
  return useQuery({
    queryKey: ["ownerListings", userId, moderationStatuses],
    queryFn: () => apiClient<PropertyList>(`/api/v1/properties/by-agent/${userId}`),
    select: (items) =>
      moderationStatuses?.length
        ? items.filter((item) => moderationStatuses.includes(item.moderation_status))
        : items,
    staleTime: 60_000,
    enabled: Boolean(userId),
  });
}
