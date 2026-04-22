import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property, PropertyCreate } from "@/types";

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PropertyCreate) =>
      apiClient<Property>("/api/v1/properties/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: async (property) => {
      queryClient.setQueryData<Property[]>(
        ["ownerListings", property.user_id],
        (current) => {
          if (!current) {
            return [property];
          }

          return [property, ...current.filter((item) => item.property_id !== property.property_id)];
        },
      );
      queryClient.setQueryData<Property[]>(
        ["agentListings", property.user_id],
        (current) => {
          if (!current) {
            return [property];
          }

          return [property, ...current.filter((item) => item.property_id !== property.property_id)];
        },
      );
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["agentListings"] });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"] });
    },
  });
}
