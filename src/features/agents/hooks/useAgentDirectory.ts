import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agent } from "@/types";
import type { AgentStats } from "./useAgentStats";

export interface AgentDirectoryFilters {
  agency_id?: number;
  location_id?: number;
  skip?: number;
  limit?: number;
}

function buildAgentDirectoryPath(filters: AgentDirectoryFilters) {
  const params = new URLSearchParams();

  if (typeof filters.agency_id === "number") {
    params.set("agency_id", String(filters.agency_id));
  }

  if (typeof filters.location_id === "number") {
    params.set("location_id", String(filters.location_id));
  }

  params.set("skip", String(filters.skip ?? 0));
  params.set("limit", String(filters.limit ?? 24));

  return `/api/v1/agent-profiles/?${params.toString()}`;
}

export function useAgentDirectory(filters: AgentDirectoryFilters = {}) {
  return useQuery({
    queryKey: ["agentDirectory", filters],
    queryFn: () =>
      apiClient<Agent[]>(buildAgentDirectoryPath(filters), { authMode: "omit" }),
    staleTime: 60_000,
  });
}

export function useVisibleAgentStats(agents: Agent[], enabled = true) {
  return useQueries({
    queries: agents.map((agent) => ({
      queryKey: ["agentStats", agent.profile_id],
      queryFn: () =>
        apiClient<AgentStats>(`/api/v1/agent-profiles/${agent.profile_id}/stats`, {
          authMode: "omit",
        }),
      staleTime: 60_000,
      enabled,
    })),
    combine: (results) => {
      const statsByProfileId = new Map<
        number,
        {
          listingCount?: number | null;
          averageRating?: number | null;
          isLoading: boolean;
          isError: boolean;
        }
      >();

      agents.forEach((agent, index) => {
        const result = results[index];
        const stats = result?.data;

        statsByProfileId.set(agent.profile_id, {
          listingCount:
            stats?.total_listings ??
            stats?.listing_count ??
            (typeof stats?.active_listings === "number" ? stats.active_listings : null),
          averageRating: stats?.average_rating ?? stats?.avg_rating ?? null,
          isLoading: Boolean(result?.isLoading),
          isError: Boolean(result?.isError),
        });
      });

      return statsByProfileId;
    },
  });
}
