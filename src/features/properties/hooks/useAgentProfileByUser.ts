import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agent } from "@/types";

export function useAgentProfileByUser(userId?: number | null) {
  return useQuery({
    queryKey: ["agentProfileByUser", userId],
    queryFn: () =>
      apiClient<Agent>(`/api/v1/agent-profiles/by-user/${userId}`, {
        authMode: "omit",
      }),
    staleTime: 60_000,
    enabled: typeof userId === "number",
  });
}
