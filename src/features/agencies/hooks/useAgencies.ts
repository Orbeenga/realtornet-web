import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agency, Agent, PropertyList } from "@/types";

export interface AgencyStats {
  agent_count?: number;
  property_count?: number;
  active_listings?: number;
  listing_count?: number;
  total_agents?: number;
  total_properties?: number;
  [key: string]: unknown;
}

export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: () => apiClient<Agency[]>("/api/v1/agencies/"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAgencyStats(agencyId?: string | number | null, enabled = true) {
  return useQuery({
    queryKey: ["agencyStats", agencyId],
    queryFn: () => apiClient<AgencyStats>(`/api/v1/agencies/${agencyId}/stats`),
    staleTime: 60_000,
    enabled: enabled && Boolean(agencyId),
  });
}

export function useVisibleAgencyStats(agencies: Agency[]) {
  return useQueries({
    queries: agencies.flatMap((agency) => [
      {
        queryKey: ["agencyListings", agency.agency_id, "count"],
        queryFn: () =>
          apiClient<PropertyList>(
            `/api/v1/agencies/${agency.agency_id}/properties?limit=100`,
          ),
        staleTime: 60_000,
      },
      {
        queryKey: ["agencyAgents", agency.agency_id, "count"],
        queryFn: () =>
          apiClient<Agent[]>(
            `/api/v1/agencies/${agency.agency_id}/agents?limit=100`,
          ),
        staleTime: 60_000,
      },
    ]),
    combine: (results) => {
      const statsByAgencyId = new Map<
        number,
        { listingCount: number; agentCount: number; isLoading: boolean }
      >();

      agencies.forEach((agency, index) => {
        const listingsResult = results[index * 2];
        const agentsResult = results[index * 2 + 1];

        statsByAgencyId.set(agency.agency_id, {
          listingCount: Array.isArray(listingsResult?.data)
            ? listingsResult.data.length
            : 0,
          agentCount: Array.isArray(agentsResult?.data)
            ? agentsResult.data.length
            : 0,
          isLoading: Boolean(listingsResult?.isLoading || agentsResult?.isLoading),
        });
      });

      return statsByAgencyId;
    },
  });
}
