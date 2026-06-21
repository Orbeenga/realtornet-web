import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function usePendingAdmin(enabled: boolean) {
  return useQuery({
    queryKey: ["pending-admin"],
    queryFn: () =>
      apiClient<PropertyList>("/api/v1/properties/pending-admin"),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled,
  });
}
