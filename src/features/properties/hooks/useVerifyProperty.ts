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
    onSuccess: (_data, { propertyId }) => {
      // Refresh both moderation and public-facing queries so the dashboard
      // badge and /properties visibility stay aligned after moderation.
      queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["agentListings"] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}
