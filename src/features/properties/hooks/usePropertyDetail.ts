import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property } from "@/types";

export function usePropertyDetail(id: string | number) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => apiClient<Property>(`/api/v1/properties/${id}`),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
