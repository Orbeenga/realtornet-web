import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AgentListingStatusItem {
  property_id: number;
  property_type: string | null;
  moderation_status: string;
  title: string;
  created_at: string;
}

export interface AgentListingsByStatusResponse {
  count: number;
  statuses: Array<{ status: string; count: number }>;
  items: AgentListingStatusItem[];
}

export interface AgentInquiryResponseDetail {
  inquiry_id: number;
  property_id: number;
  property_title: string | null;
  responded: boolean;
  response_time_minutes: number | null;
  created_at: string;
}

export interface AgentInquiryResponseRateResponse {
  rate: number;
  period: string;
  total_inquiries: number;
  responded: number;
  unresponded: number;
  details: AgentInquiryResponseDetail[];
}

export interface AgentMembershipDetail {
  membership_id: number;
  user_id: number;
  agency_id: number;
  agency_name: string;
  role: string;
  joined_at: string;
  status: string;
}

export interface AgentMembershipsResponse {
  count: number;
  memberships: AgentMembershipDetail[];
}

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
