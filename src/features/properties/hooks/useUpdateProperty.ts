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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
        queryClient.invalidateQueries({ queryKey: ["properties", variables.propertyId] }),
        queryClient.invalidateQueries({ queryKey: ["property", variables.propertyId] }),
        queryClient.invalidateQueries({ queryKey: ["agentListings"] }),
      ]);
    },
  });
}
