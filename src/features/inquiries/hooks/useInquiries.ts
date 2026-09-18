import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { Inquiry } from "@/types";

export function useInquiries() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ["inquiries"],
    queryFn: () => apiClient<Inquiry[]>("/api/v1/inquiries/"),
    staleTime: 30_000,
    enabled: typeof profile?.user_id === "number",
  });
}
