import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useAgentListings(id: string | number) {
  return useQuery({
    queryKey: ["agentListings", id],
    queryFn: () =>
      apiClient<PropertyList>(`/api/v1/agent-profiles/${id}/properties`, {
        authMode: "omit",
      }),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
