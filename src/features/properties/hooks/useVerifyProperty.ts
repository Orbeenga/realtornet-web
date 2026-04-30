import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { MODERATION_STATUS, isVerifiedModerationStatus } from "@/features/properties/lib/moderation";
import type { ModerationStatus, Property, PropertyVerificationUpdate } from "@/types";

interface UpdatePropertyModerationInput {
  propertyId: number;
  moderationStatus: ModerationStatus;
  moderationReason?: string | null;
}

export function useVerifyProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ propertyId, moderationStatus, moderationReason }) => {
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

      const applyModerationStatus = (items?: Property[]) =>
        items?.map((item) =>
          item.property_id === propertyId
            ? {
                ...item,
                is_verified: isVerifiedModerationStatus(moderationStatus),
                moderation_status: moderationStatus,
                moderation_reason: moderationReason ?? null,
              }
            : item,
        );

      queryClient.setQueryData<Property[]>(["adminProperties"], (current) =>
        applyModerationStatus(current),
      );
      queryClient.setQueryData<Property>(["property", propertyId], (current) =>
        current
          ? {
              ...current,
              is_verified: isVerifiedModerationStatus(moderationStatus),
              moderation_status: moderationStatus,
              moderation_reason: moderationReason ?? null,
            }
          : current,
      );

      previousAgentListings.forEach(([queryKey]) => {
        queryClient.setQueryData<Property[]>(queryKey, (current) =>
          applyModerationStatus(current),
        );
      });
      previousOwnerListings.forEach(([queryKey]) => {
        queryClient.setQueryData<Property[]>(queryKey, (current) =>
          applyModerationStatus(current),
        );
      });
      previousProperties.forEach(([queryKey]) => {
        queryClient.setQueryData<Property[]>(queryKey, (current) =>
          applyModerationStatus(current),
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
    mutationFn: ({
      propertyId,
      moderationStatus,
      moderationReason,
    }: UpdatePropertyModerationInput) => {
      if (moderationStatus === MODERATION_STATUS.verified) {
        return apiClient<Property>(`/api/v1/admin/properties/${propertyId}/verify`, {
          method: "POST",
        });
      }

      const payload: PropertyVerificationUpdate = {
        moderation_status: moderationStatus,
        moderation_reason: moderationReason ?? null,
      };

      return apiClient<Property>(`/api/v1/properties/${propertyId}/verify`, {
        method: "PATCH",
        body: JSON.stringify(payload),
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
