import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agency } from "@/types";

export function useAgencyProfile(id: string | number) {
  return useQuery({
    queryKey: ["agency", id],
    queryFn: () => apiClient<Agency>(`/api/v1/agencies/${id}`),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
