import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property } from "@/types";

export function useAgencyApproveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: number) =>
      apiClient<Property>(`/api/v1/properties/${propertyId}/agency-approve`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"] });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
    },
  });
}
