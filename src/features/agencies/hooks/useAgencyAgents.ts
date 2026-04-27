import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AgencyAgentRosterMember } from "@/types";

export function useAgencyAgents(id: string | number) {
  return useQuery({
    queryKey: ["agencyAgents", id],
    queryFn: () =>
      apiClient<AgencyAgentRosterMember[]>(`/api/v1/agencies/${id}/agents/`),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
