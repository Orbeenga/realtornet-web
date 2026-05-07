import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agency } from "@/types";

export interface AgencyStats {
  agent_count?: number;
  property_count?: number;
  active_listings?: number;
  listing_count?: number;
  total_agents?: number;
  total_properties?: number;
  [key: string]: unknown;
}

export function getAgencyListingCount(stats?: AgencyStats) {
  return (
    stats?.active_listings ??
    stats?.listing_count ??
    stats?.property_count ??
    stats?.total_properties
  );
}

export function getAgencyAgentCount(stats?: AgencyStats) {
  return stats?.agent_count ?? stats?.total_agents;
}

export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: () =>
      apiClient<Agency[]>("/api/v1/agencies/", { authMode: "omit" }),
    staleTime: 60_000,
    enabled,
  });
}

export function useAgencyStats(
  agencyId?: string | number | null,
  enabled = true,
  authMode: "include" | "omit" = "omit",
) {
  return useQuery({
    queryKey: ["agencyStats", agencyId],
    queryFn: () =>
      apiClient<AgencyStats>(`/api/v1/agencies/${agencyId}/stats`, {
        authMode,
      }),
    staleTime: 60_000,
    enabled: enabled && Boolean(agencyId),
  });
}

export function useVisibleAgencyStats(agencies: Agency[], enabled = true) {
  return useQueries({
    queries: agencies.map((agency) => (
      {
        queryKey: ["agencyStats", agency.agency_id],
        queryFn: () =>
          apiClient<AgencyStats>(`/api/v1/agencies/${agency.agency_id}/stats`, {
            authMode: "omit",
          }),
        staleTime: 60_000,
        enabled,
      }
    )),
    combine: (results) => {
      const statsByAgencyId = new Map<
        number,
        {
          listingCount?: number;
          agentCount?: number;
          isLoading: boolean;
          isError: boolean;
        }
      >();

      agencies.forEach((agency, index) => {
        const result = results[index];
        const stats = result?.data;

        statsByAgencyId.set(agency.agency_id, {
          listingCount: getAgencyListingCount(stats),
          agentCount: getAgencyAgentCount(stats),
          isLoading: Boolean(result?.isLoading),
          isError: Boolean(result?.isError),
        });
      });

      return statsByAgencyId;
    },
  });
}
