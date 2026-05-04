import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Inquiry } from "@/types";

export function useInquiryCountByProperty(
  propertyId?: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["propertyInquiryCount", propertyId],
    queryFn: async () => {
      const inquiries = await apiClient<Inquiry[]>(
        `/api/v1/inquiries/by-property/${propertyId}`,
      );

      return inquiries.length;
    },
    enabled: enabled && typeof propertyId === "number",
    staleTime: 30_000,
  });
}
