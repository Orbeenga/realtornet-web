import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AgencyMembershipHistory } from "@/types";

export function useAgencyMembershipHistory(
  agencyId?: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["agencyMembershipHistory", agencyId],
    queryFn: () =>
      apiClient<AgencyMembershipHistory[]>(
        `/api/v1/agencies/${agencyId}/membership-history/`,
      ),
    staleTime: 30_000,
    enabled: enabled && Boolean(agencyId),
  });
}
