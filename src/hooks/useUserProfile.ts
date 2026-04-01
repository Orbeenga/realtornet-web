import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { UserProfile } from "@/types";

export function useUserProfile() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["userProfile"],
    queryFn: () => apiClient<UserProfile>("/api/v1/users/me"),
    enabled: Boolean(session),
    staleTime: 120_000,
  });
}
