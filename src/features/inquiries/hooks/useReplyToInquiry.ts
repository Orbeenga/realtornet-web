"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { InquiryReplyResponse } from "@/types";

export function useReplyToInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inquiryId,
      body,
      parentReplyId,
    }: {
      inquiryId: number;
      body: string;
      parentReplyId?: number | null;
    }) =>
      apiClient<InquiryReplyResponse>(
        `/api/v1/inquiries/${inquiryId}/reply/`,
        {
          method: "POST",
          body: JSON.stringify({ body, parent_reply_id: parentReplyId ?? null }),
        },
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inquiryDirectory"] }),
        queryClient.invalidateQueries({
          queryKey: ["inquiryReplies", variables.inquiryId],
        }),
      ]);
    },
  });
}
