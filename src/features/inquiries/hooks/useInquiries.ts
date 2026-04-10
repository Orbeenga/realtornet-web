import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Inquiry } from "@/types";

export function useInquiries() {
  return useQuery({
    queryKey: ["inquiries"],
    queryFn: () => apiClient<Inquiry[]>("/api/v1/inquiries/"),
    staleTime: 30_000,
  });
}
