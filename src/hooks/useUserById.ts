import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { UserProfile } from "@/types";

export function useUserById(userId?: number | null) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => apiClient<UserProfile>(`/api/v1/users/${userId}`),
    staleTime: 60_000,
    enabled: typeof userId === "number",
  });
}

export function useUsersByIds(userIds: number[]) {
  const uniqueIds = [...new Set(userIds.filter((id) => typeof id === "number"))];

  return useQueries({
    queries: uniqueIds.map((userId) => ({
      queryKey: ["user", userId],
      queryFn: () => apiClient<UserProfile>(`/api/v1/users/${userId}`),
      staleTime: 60_000,
      enabled: typeof userId === "number",
    })),
  });
}
