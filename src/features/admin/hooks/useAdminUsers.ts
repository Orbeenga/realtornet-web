import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api/client";
import type { Agent, UserDeactivateRequest, UserProfile, UserRole } from "@/types";

function extractUserCollection(
  payload: UserProfile[] | Record<string, unknown>,
): UserProfile[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = ["items", "results", "data", "users"];

  for (const key of candidates) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value as UserProfile[];
    }
  }

  return [];
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const payload = await apiClient<UserProfile[] | Record<string, unknown>>(
        "/api/v1/admin/users",
      );

      return extractUserCollection(payload);
    },
    staleTime: 30_000,
  });
}

export function useUpdateAdminUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      userRole,
    }: {
      userId: number;
      userRole: Extract<UserRole, "seeker" | "agent">;
    }) =>
      apiClient<UserProfile>(`/api/v1/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          user_role: userRole,
        }),
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
        queryClient.invalidateQueries({
          queryKey: ["agentProfileByUser", variables.userId],
        }),
      ]);
    },
  });
}

export function useAgentProfileForAdmin(userId?: number | null) {
  return useQuery({
    queryKey: ["agentProfileByUser", userId],
    queryFn: async () => {
      try {
        return await apiClient<Agent>(`/api/v1/agent-profiles/by-user/${userId}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: typeof userId === "number",
    staleTime: 30_000,
  });
}

export function useAssignAgentAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      agencyId,
      agentProfile,
    }: {
      userId: number;
      agencyId: number;
      agentProfile: Agent | null;
    }) => {
      if (agentProfile?.profile_id) {
        return apiClient<Agent>(`/api/v1/agent-profiles/${agentProfile.profile_id}`, {
          method: "PUT",
          body: JSON.stringify({
            agency_id: agencyId,
          }),
        });
      }

      return apiClient<Agent>("/api/v1/agent-profiles/", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          agency_id: agencyId,
        }),
      });
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agencies"] }),
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
        queryClient.invalidateQueries({
          queryKey: ["agentProfileByUser", variables.userId],
        }),
      ]);
    },
  });
}

export function useDeactivateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: UserDeactivateRequest;
    }) =>
      apiClient<UserProfile>(`/api/v1/admin/users/${userId}/deactivate`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

export function useActivateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      apiClient<UserProfile>(`/api/v1/admin/users/${userId}/activate`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}
