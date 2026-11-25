import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Agent } from "@/types";

export function useUpdateAgentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      payload,
    }: {
      profileId: number;
      payload: { company_name?: string; specialization?: string };
    }) =>
      apiClient<Agent>(`/api/v1/agent-profiles/${profileId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    // FE-001: company/specialization display on the B3 signal, the owner
    // roster, and the public directory (B3b visibility flips here).
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agentProfileByUser"] }),
        queryClient.invalidateQueries({ queryKey: ["agencyAgents"] }),
        queryClient.invalidateQueries({ queryKey: ["agent"] }),
        queryClient.invalidateQueries({ queryKey: ["agentDirectory"] }),
      ]);
    },
  });
}
