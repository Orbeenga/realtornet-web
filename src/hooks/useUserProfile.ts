import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { UserProfile } from "@/types";

export function useUserProfile(enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["userProfile"],
    queryFn: () => apiClient<UserProfile>("/api/v1/auth/me"),
    enabled: Boolean(token) && enabled,
    staleTime: 120_000,
  });
}
