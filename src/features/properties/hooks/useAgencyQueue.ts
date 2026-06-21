import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useAgencyQueue(enabled: boolean) {
  return useQuery({
    queryKey: ["agency-queue"],
    queryFn: () =>
      apiClient<PropertyList>("/api/v1/properties/agency-queue"),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled,
  });
}
