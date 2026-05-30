import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ModerationStatus, PropertyList } from "@/types";

export function useAgencyOwnerListings(
  agencyId?: number | null,
  moderationStatus?: ModerationStatus | null,
) {
  return useQuery({
    queryKey: ["agencyOwnerListings", agencyId, moderationStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeof agencyId === "number") {
        params.set("agency_id", String(agencyId));
      }
      if (moderationStatus) {
        params.set("moderation_status", moderationStatus);
      }
      return apiClient<PropertyList>(`/api/v1/properties/?${params.toString()}`, {
        authMode: "include",
      });
    },
    staleTime: 60_000,
    enabled: typeof agencyId === "number",
  });
}
