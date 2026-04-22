import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property } from "@/types";

interface VerifyPropertyInput {
  propertyId: number;
  isVerified: boolean;
}

export function useVerifyProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ propertyId, isVerified }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["adminProperties"] }),
        queryClient.cancelQueries({ queryKey: ["properties"] }),
        queryClient.cancelQueries({ queryKey: ["agentListings"] }),
        queryClient.cancelQueries({ queryKey: ["ownerListings"] }),
        queryClient.cancelQueries({ queryKey: ["property", propertyId] }),
      ]);

      const previousAdminProperties =
        queryClient.getQueryData<Property[]>(["adminProperties"]) ?? null;
      const previousProperty =
        queryClient.getQueryData<Property>(["property", propertyId]) ?? null;
      const previousAgentListings = queryClient.getQueriesData<Property[]>({
        queryKey: ["agentListings"],
      });
      const previousOwnerListings = queryClient.getQueriesData<Property[]>({
        queryKey: ["ownerListings"],
      });
      const previousProperties = queryClient.getQueriesData<Property[]>({
        queryKey: ["properties"],
      });

      const applyVerification = (items?: Property[]) =>
        items?.map((item) =>
          item.property_id === propertyId
            ? { ...item, is_verified: isVerified }
            : item,
        );

      queryClient.setQueryData<Property[]>(["adminProperties"], (current) =>
        applyVerification(current),
      );
      queryClient.setQueryData<Property>(["property", propertyId], (current) =>
        current ? { ...current, is_verified: isVerified } : current,
      );

      previousAgentListings.forEach(([queryKey]) => {
        queryClient.setQueryData<Property[]>(queryKey, (current) =>
          applyVerification(current),
        );
      });
      previousOwnerListings.forEach(([queryKey]) => {
        queryClient.setQueryData<Property[]>(queryKey, (current) =>
          applyVerification(current),
        );
      });
      previousProperties.forEach(([queryKey]) => {
        queryClient.setQueryData<Property[]>(queryKey, (current) =>
          applyVerification(current),
        );
      });

      return {
        previousAdminProperties,
        previousProperty,
        previousAgentListings,
        previousOwnerListings,
        previousProperties,
      };
    },
    mutationFn: ({ propertyId, isVerified }: VerifyPropertyInput) => {
      // The backend exposes a dedicated admin verification endpoint for the
      // happy path. Moving a listing back to pending uses the standard admin-
      // authorized property update route, which also accepts is_verified.
      if (isVerified) {
        return apiClient<Property>(`/api/v1/admin/properties/${propertyId}/verify`, {
          method: "POST",
        });
      }

      return apiClient<Property>(`/api/v1/properties/${propertyId}`, {
        method: "PUT",
        body: JSON.stringify({ is_verified: false }),
      });
    },
    onError: (_error, { propertyId }, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(["adminProperties"], context.previousAdminProperties);
      queryClient.setQueryData(["property", propertyId], context.previousProperty);

      context.previousAgentListings.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context.previousOwnerListings.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context.previousProperties.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, { propertyId }) => {
      // Refresh both moderation and public-facing queries so the dashboard
      // badge and /properties visibility stay aligned after moderation.
      queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["agentListings"] });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}
