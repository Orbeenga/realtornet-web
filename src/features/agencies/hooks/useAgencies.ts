import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agency } from "@/types";

export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: () => apiClient<Agency[]>("/api/v1/agencies/"),
    staleTime: 60_000,
    enabled,
  });
}
