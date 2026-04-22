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
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["agentListings"] });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"] });
      queryClient.removeQueries({ queryKey: ["property", propertyId] });
    },
  });
}
