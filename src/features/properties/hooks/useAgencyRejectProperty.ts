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
      queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"] });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
    },
  });
}
