"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { InquiryReplyEdit, InquiryReplyResponse } from "@/types";

export function useEditReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inquiryId,
      replyId,
      payload,
    }: {
      inquiryId: number;
      replyId: number;
      payload: InquiryReplyEdit;
    }) =>
      apiClient<InquiryReplyResponse>(
        `/api/v1/inquiries/${inquiryId}/replies/${replyId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["inquiryReplies", variables.inquiryId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["inquiryDirectory"],
      });
    },
  });
}
