import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AgentStats {
  total_listings?: number | null;
  listing_count?: number | null;
  average_rating?: number | null;
  avg_rating?: number | null;
  inquiry_count?: number | null;
  total_inquiries?: number | null;
  review_count?: number | null;
  [key: string]: unknown;
}

export function useAgentStats(agentId?: string | number | null) {
  return useQuery({
    queryKey: ["agentStats", agentId],
    queryFn: () =>
      apiClient<AgentStats>(`/api/v1/agent-profiles/${agentId}/stats`),
    enabled: Boolean(agentId),
    staleTime: 60_000,
  });
}
