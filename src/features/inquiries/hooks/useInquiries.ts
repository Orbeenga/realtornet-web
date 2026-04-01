import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Inquiry, InquiryCreate } from "@/types";

export function useInquiries() {
  return useQuery({
    queryKey: ["inquiries"],
    queryFn: () => apiClient<Inquiry[]>("/api/v1/inquiries/"),
    staleTime: 30_000,
  });
}

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
  });
}
