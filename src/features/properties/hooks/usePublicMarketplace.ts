import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function usePublicMarketplace(enabled: boolean) {
  return useQuery({
    queryKey: ["public-marketplace"],
    queryFn: () =>
      apiClient<PropertyList>("/api/v1/properties?moderation_status=live", {
        authMode: "include",
      }),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled,
  });
}
