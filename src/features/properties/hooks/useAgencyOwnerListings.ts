import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ModerationStatus, PropertyList } from "@/types";

export function useAgencyOwnerListings(
  agencyId?: number | string | null,
  moderationStatuses?: ModerationStatus[] | null,
) {
  const numericAgencyId =
    agencyId != null && agencyId !== "" ? Number(agencyId) : null;
  const isEnabled =
    numericAgencyId != null && !Number.isNaN(numericAgencyId);
  const singleStatus =
    moderationStatuses?.length === 1 ? moderationStatuses[0] : null;

  return useQuery({
    queryKey: ["agencyOwnerListings", numericAgencyId, moderationStatuses],
    queryFn: () => {
      const params = new URLSearchParams();
      if (isEnabled) {
        params.set("agency_id", String(numericAgencyId));
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
    staleTime: 30_000,
    enabled: isEnabled,
  });
}
