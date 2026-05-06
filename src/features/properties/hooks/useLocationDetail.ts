import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Location } from "@/types";

export function useLocationDetail(locationId?: number | null) {
  return useQuery({
    queryKey: ["location", locationId],
    queryFn: () =>
      apiClient<Location>(`/api/v1/locations/${locationId}`, {
        authMode: "omit",
      }),
    staleTime: 60_000,
    enabled: typeof locationId === "number",
  });
}
