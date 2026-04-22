import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useOwnerListings(userId?: string | number) {
  return useQuery({
    queryKey: ["ownerListings", userId],
    queryFn: () => apiClient<PropertyList>(`/api/v1/properties/by-agent/${userId}`),
    staleTime: 60_000,
    enabled: Boolean(userId),
  });
}
