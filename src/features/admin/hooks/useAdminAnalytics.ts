import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  ActiveProperty,
  AgentPerformance,
  DataIntegrity,
  SystemStats,
  UsageMetrics,
} from "@/types";

export function useAdminSystemStats(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "systemStats"],
    queryFn: () => apiClient<SystemStats>("/api/v1/analytics/system/stats"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminUsageMetrics(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "usage"],
    queryFn: () => apiClient<UsageMetrics>("/api/v1/analytics/system/usage"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminDataIntegrity(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "integrity"],
    queryFn: () => apiClient<DataIntegrity>("/api/v1/analytics/system/integrity"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminAgentPerformance(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "agentPerformance"],
    queryFn: () =>
      apiClient<AgentPerformance[]>("/api/v1/analytics/agents/performance"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminTopAgents(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "topAgents"],
    queryFn: () =>
      apiClient<AgentPerformance[]>("/api/v1/analytics/agents/top?limit=10"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminActiveProperties(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "activeProperties"],
    queryFn: () =>
      apiClient<ActiveProperty[]>("/api/v1/analytics/properties/active?limit=100"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminFeaturedProperties(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "featuredProperties"],
    queryFn: () =>
      apiClient<ActiveProperty[]>("/api/v1/analytics/properties/featured?limit=100"),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminStatsOverview(enabled = true) {
  return useQuery({
    queryKey: ["adminAnalytics", "overview"],
    queryFn: () =>
      apiClient<Record<string, unknown>>("/api/v1/admin/stats/overview"),
    staleTime: 60_000,
    enabled,
  });
}
