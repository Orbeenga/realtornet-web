import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Location } from "@/types";

export function useLocations(enabled = true) {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () =>
      apiClient<Location[]>("/api/v1/locations/", { authMode: "omit" }),
    staleTime: 60_000,
    enabled,
  });
}
