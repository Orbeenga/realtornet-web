import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ModerationStatus, PropertyList } from "@/types";

export function useAdminProperties(
  enabled: boolean,
  moderationStatus?: ModerationStatus | null,
) {
  return useQuery({
    queryKey: ["adminProperties", moderationStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ skip: "0", limit: "100" });
      if (moderationStatus) {
        params.set("moderation_status", moderationStatus);
      }
      const response = await apiClient<{ items?: PropertyList } | PropertyList>(
        `/api/v1/admin/properties?${params.toString()}`,
      );

      if (Array.isArray(response)) {
        return response;
      }

      return response.items ?? [];
    },
    staleTime: 30_000,
    enabled,
  });
}
