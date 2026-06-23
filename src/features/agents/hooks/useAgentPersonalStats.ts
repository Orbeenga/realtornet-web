import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AgentPersonalStats {
  user_id: number;
  listings_by_status: Record<string, number>;
  total_inquiries_received: number;
  inquiries_responded: number;
  response_rate: number;
  membership_counts: Record<string, number>;
}

export function useAgentPersonalStats(enabled = true) {
  return useQuery({
    queryKey: ["agentPersonalStats"],
    queryFn: () =>
      apiClient<AgentPersonalStats>("/api/v1/analytics/agents/me/stats"),
    enabled,
    staleTime: 30_000,
  });
}
