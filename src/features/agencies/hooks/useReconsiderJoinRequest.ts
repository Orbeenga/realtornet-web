import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useReconsiderJoinRequest(agencyId?: string | number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      apiClient<void>(
        `/api/v1/agencies/${agencyId}/join-requests/${requestId}/reconsider/`,
        { method: "PATCH" },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agencyJoinRequests", agencyId] });
    },
  });
}
