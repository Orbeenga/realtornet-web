import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property, PropertyAgencyActionUpdate } from "@/types";

type ReasonInput = {
  propertyId: number;
  reason: string;
};

function useLifecycleMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Property>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (property) => {
      // Invalidate all actor perspectives referencing the same listing pool.
      // Use refetchType: "all" so that inactive cached queries (e.g. an agent's
      // cached tab data not currently mounted) are refetched immediately.
      const opts = { refetchType: "all" as const };
      queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agentListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["ownerListings"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["properties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["adminProperties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["featuredProperties"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["property", property.property_id], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agency-inventory"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["agency-queue"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["pending-admin"], ...opts });
      queryClient.invalidateQueries({ queryKey: ["listingEvents", property.property_id], ...opts });
    },
  });
}

function reasonPayload(reason: string): PropertyAgencyActionUpdate {
  return { moderation_reason: reason };
}

export function useSubmitPropertyForReview() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/submit-for-review`, {
      method: "PATCH",
    }),
  );
}

export function useSubmitPropertyToAdmin() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/submit-to-admin`, {
      method: "PATCH",
    }),
  );
}

export function useWithdrawPropertyFromReview() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/withdraw`, {
      method: "PATCH",
    }),
  );
}

export function useResubmitProperty() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/resubmit`, {
      method: "PATCH",
    }),
  );
}

export function useRecallPropertyFromAdminReview() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/recall`, {
      method: "PATCH",
    }),
  );
}

export function useAdminApproveProperty() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ moderation_status: "live", moderation_reason: null }),
    }),
  );
}

export function useAdminRejectProperty() {
  return useLifecycleMutation(({ propertyId, reason }: ReasonInput) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/admin-reject`, {
      method: "PATCH",
      body: JSON.stringify(reasonPayload(reason)),
    }),
  );
}

export function useReinstateProperty() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/reinstate`, {
      method: "PATCH",
    }),
  );
}

export function useRevokeProperty() {
  return useLifecycleMutation(({ propertyId, reason }: ReasonInput) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/revoke`, {
      method: "PATCH",
      body: JSON.stringify(reasonPayload(reason)),
    }),
  );
}

export function useRestoreProperty() {
  return useLifecycleMutation((propertyId: number) =>
    apiClient<Property>(`/api/v1/properties/${propertyId}/restore`, {
      method: "PATCH",
    }),
  );
}
