import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AgencyOwnershipTransferRequest } from "@/types";

export interface TransferOwnershipVariables {
  agencyId: number;
  payload: AgencyOwnershipTransferRequest;
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: TransferOwnershipVariables) =>
      apiClient<{ detail: string; new_owner_user_id: number; demote_existing_owner_to_agent: boolean }>(
        `/api/v1/agencies/${agencyId}/transfer-ownership`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agencyAgents"] }),
        queryClient.invalidateQueries({ queryKey: ["agencyProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["agencyStats"] }),
        queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] }),
      ]);
    },
  });
}
