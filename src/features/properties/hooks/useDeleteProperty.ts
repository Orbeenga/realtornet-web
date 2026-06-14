import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: number) =>
      apiClient<void>(`/api/v1/properties/${propertyId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, propertyId) => {
      const opts = { refetchType: "all" as const };
      queryClient.invalidateQueries({ queryKey: ["properties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agentListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["adminProperties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["featuredProperties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agency-inventory"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agency-queue"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["pending-admin"], ...opts });
      queryClient.removeQueries({ queryKey: ["property", propertyId] });
    },
  });
}
