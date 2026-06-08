import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property } from "@/types";

export function usePropertyDetail(
  id: string | number,
  enabled = true,
  authMode: "include" | "omit" = "omit",
) {
  return useQuery({
    queryKey: ["property", id, authMode],
    queryFn: () =>
      apiClient<Property>(`/api/v1/properties/${id}`, { authMode }),
    staleTime: 60_000,
    enabled: Boolean(id) && enabled,
  });
}
