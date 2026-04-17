import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property } from "@/types";

type VerificationActor = "agent" | "admin";

interface VerifyPropertyInput {
  propertyId: number;
  isVerified: boolean;
  actor: VerificationActor;
}

export function useVerifyProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyId, isVerified, actor }: VerifyPropertyInput) => {
      // Admins verify from the privileged moderation endpoint, while agents use
      // the owner-facing toggle route. The split keeps the dashboard aligned
      // with the backend's role-based API layout.
      if (actor === "admin") {
        return apiClient<Property>(`/api/v1/admin/properties/${propertyId}/verify`, {
          method: "POST",
        });
      }

      return apiClient<Property>(`/api/v1/properties/${propertyId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ is_verified: isVerified }),
      });
    },
    onSuccess: (_data, { propertyId }) => {
      // Refresh both the public feed and the agent dashboard so the badge and
      // listing visibility move together after an admin or owner flips the state.
      queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["agentListings"] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}
