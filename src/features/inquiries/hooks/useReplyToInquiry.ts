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
    }: {
      inquiryId: number;
      body: string;
    }) =>
      apiClient<InquiryReplyResponse>(
        `/api/v1/inquiries/${inquiryId}/reply/`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["inquiryDirectory"],
      });
    },
  });
}
