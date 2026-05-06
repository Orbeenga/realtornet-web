import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property } from "@/types";

export function usePropertyDetail(id: string | number, enabled = true) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () =>
      apiClient<Property>(`/api/v1/properties/${id}`, { authMode: "omit" }),
    staleTime: 60_000,
    enabled: Boolean(id) && enabled,
  });
}
