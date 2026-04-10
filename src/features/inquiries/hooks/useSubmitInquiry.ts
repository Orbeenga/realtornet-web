import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api/client";
import type { Inquiry, InquiryCreate } from "@/types";

export function useSubmitInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InquiryCreate) =>
      apiClient<Inquiry>("/api/v1/inquiries/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    throwOnError: (error) => !(error instanceof ApiError),
  });
}
