import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Location } from "@/types";

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () => apiClient<Location[]>("/api/v1/locations/"),
    staleTime: 60_000,
  });
}
