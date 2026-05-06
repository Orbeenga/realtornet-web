import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useAgencyListings(id: string | number) {
  return useQuery({
    queryKey: ["agencyListings", id],
    queryFn: () =>
      apiClient<PropertyList>(`/api/v1/agencies/${id}/properties`, {
        authMode: "omit",
      }),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
