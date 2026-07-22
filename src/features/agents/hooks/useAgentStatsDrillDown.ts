import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

type AgentListingsByStatusResponse = components["schemas"]["AgentListingsByStatusResponse"];
type AgentInquiryResponseRateResponse = components["schemas"]["AgentInquiryResponseRateResponse"];
type AgentMembershipsResponse = components["schemas"]["AgentMembershipsResponse"];

export type { AgentListingsByStatusResponse, AgentInquiryResponseRateResponse, AgentMembershipsResponse };

export function useAgentListingsByStatus(
  params?: { status?: string; pendingOnly?: boolean },
  enabled = true,
) {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set("status", params.status);
  }
  if (params?.pendingOnly) {
    search.set("pending_only", "true");
  }
  const query = search.toString();

  return useQuery({
    queryKey: ["agentStatsDrillDown", "listings-by-status", params],
    queryFn: () =>
      apiClient<AgentListingsByStatusResponse>(
        `/api/v1/analytics/agents/me/stats/listings-by-status${query ? `?${query}` : ""}`,
      ),
    enabled,
    staleTime: 30_000,
  });
}

export function useAgentInquiryResponseRate(enabled = true) {
  return useQuery({
    queryKey: ["agentStatsDrillDown", "inquiry-response-rate"],
    queryFn: () =>
      apiClient<AgentInquiryResponseRateResponse>(
        "/api/v1/analytics/agents/me/stats/inquiry-response-rate",
      ),
    enabled,
    staleTime: 30_000,
  });
}

export function useAgentAgencyMemberships(enabled = true) {
  return useQuery({
    queryKey: ["agentStatsDrillDown", "agency-memberships"],
    queryFn: () =>
      apiClient<AgentMembershipsResponse>(
        "/api/v1/analytics/agents/me/stats/agency-memberships",
      ),
    enabled,
    staleTime: 30_000,
  });
}
