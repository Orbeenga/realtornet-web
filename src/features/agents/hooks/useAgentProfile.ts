import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agent } from "@/types";

export function useAgentProfile(id: string | number) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: () => apiClient<Agent>(`/api/v1/agent-profiles/${id}`),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
