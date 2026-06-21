import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useAgencyInventory(enabled: boolean) {
  return useQuery({
    queryKey: ["agency-inventory"],
    queryFn: () =>
      apiClient<PropertyList>("/api/v1/properties/agency-inventory"),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled,
  });
}
