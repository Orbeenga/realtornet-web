"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { InquiryReplyResponse } from "@/types";

export function useReplies(inquiryId: number | null) {
  return useQuery({
    queryKey: ["inquiryReplies", inquiryId],
    queryFn: () =>
      apiClient<InquiryReplyResponse[]>(
        `/api/v1/inquiries/${inquiryId}/replies/`,
      ),
    staleTime: 10_000,
    refetchInterval: 10_000,
    enabled: typeof inquiryId === "number",
  });
}
