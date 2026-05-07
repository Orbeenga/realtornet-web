import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AgencyAgentRosterMember } from "@/types";

export function useAgencyAgents(
  id: string | number,
  status?: "all",
  enabled = true,
) {
  const query = status ? `?status=${status}` : "";

  return useQuery({
    queryKey: ["agencyAgents", id, status ?? "active"],
    queryFn: () =>
      apiClient<AgencyAgentRosterMember[]>(
        `/api/v1/agencies/${id}/agents/${query}`,
        status === "all" ? undefined : { authMode: "omit" },
      ),
    staleTime: 60_000,
    enabled: enabled && Boolean(id),
  });
}
