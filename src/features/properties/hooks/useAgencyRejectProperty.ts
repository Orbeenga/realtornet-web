import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property, PropertyAgencyActionUpdate } from "@/types";

interface AgencyRejectInput {
  propertyId: number;
  reason: string;
}

export function useAgencyRejectProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyId, reason }: AgencyRejectInput) => {
      const payload: PropertyAgencyActionUpdate = {
        moderation_reason: reason,
      };

      return apiClient<Property>(`/api/v1/properties/${propertyId}/agency-reject`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      const opts = { refetchType: "all" as const };
      queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agentListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["properties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["adminProperties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["featuredProperties"], ...opts });
    },
  });
}
