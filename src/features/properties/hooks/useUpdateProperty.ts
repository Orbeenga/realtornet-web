import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property, PropertyUpdate } from "@/types";

interface UpdatePropertyArgs {
  propertyId: number;
  data: PropertyUpdate;
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, data }: UpdatePropertyArgs) =>
      apiClient<Property>(`/api/v1/properties/${propertyId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: async (_property, variables) => {
      const opts = { refetchType: "all" as const };
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties"], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["properties", variables.propertyId], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["property", variables.propertyId], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["agentListings"], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["ownerListings"], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["adminProperties"], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["featuredProperties"], ...opts }),
        queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"], ...opts }),
      ]);
    },
  });
}
