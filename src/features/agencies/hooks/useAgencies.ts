import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agency, Agent, PropertyList } from "@/types";

export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: () => apiClient<Agency[]>("/api/v1/agencies/"),
    staleTime: 60_000,
    enabled,
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
