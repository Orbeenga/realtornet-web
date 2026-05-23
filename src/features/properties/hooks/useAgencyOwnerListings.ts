import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useAgencyOwnerListings(agencyId?: number | null) {
  return useQuery({
    queryKey: ["agencyOwnerListings", agencyId],
    queryFn: () =>
      apiClient<PropertyList>(`/api/v1/agencies/${agencyId}/properties`, {
        authMode: "include",
      }),
    staleTime: 60_000,
    enabled: typeof agencyId === "number",
  });
}
