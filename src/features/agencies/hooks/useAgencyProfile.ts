import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agency, AgencyUpdate } from "@/types";

export function useAgencyProfile(id: string | number) {
  return useQuery({
    queryKey: ["agency", id],
    queryFn: () =>
      apiClient<Agency>(`/api/v1/agencies/${id}`, { authMode: "omit" }),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}

export function useUpdateAgencyProfile(agencyId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgencyUpdate) => {
      if (typeof agencyId !== "number") {
        throw new Error("Agency ID is required to update an agency profile");
      }

      return apiClient<Agency>(`/api/v1/agencies/${agencyId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (agency) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agency", agency.agency_id] }),
        queryClient.invalidateQueries({ queryKey: ["agencies"] }),
      ]);
    },
  });
}
