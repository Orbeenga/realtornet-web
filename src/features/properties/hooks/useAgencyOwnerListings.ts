import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ModerationStatus, PropertyList } from "@/types";

export function useAgencyOwnerListings(
  agencyId?: number | null,
  moderationStatuses?: ModerationStatus[] | null,
) {
  const singleStatus =
    moderationStatuses?.length === 1 ? moderationStatuses[0] : null;

  return useQuery({
    queryKey: ["agencyOwnerListings", agencyId, moderationStatuses],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeof agencyId === "number") {
        params.set("agency_id", String(agencyId));
      }
      if (singleStatus) {
        params.set("moderation_status", singleStatus);
      }
      return apiClient<PropertyList>(`/api/v1/properties/?${params.toString()}`, {
        authMode: "include",
      });
    },
    select: (items) =>
      moderationStatuses?.length
        ? items.filter((item) => moderationStatuses.includes(item.moderation_status))
        : items,
    staleTime: 60_000,
    enabled: typeof agencyId === "number",
  });
}
