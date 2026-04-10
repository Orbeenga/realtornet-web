import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useInquiries } from "@/features/inquiries/hooks/useInquiries";
import type { Inquiry, Property } from "@/types";

interface InquiryFeedItem {
  inquiry: Inquiry;
  property: Property | null;
}

export function useInquiryFeed() {
  const inquiriesQuery = useInquiries();
  const propertyIds = useMemo(
    () =>
      [
        ...new Set(
          (inquiriesQuery.data ?? [])
            .map((inquiry) => inquiry.property_id)
            .filter((propertyId): propertyId is number => typeof propertyId === "number"),
        ),
      ].sort((left, right) => left - right),
    [inquiriesQuery.data],
  );

  const propertyQueries = useQueries({
    queries: propertyIds.map((propertyId) => ({
      queryKey: ["property", propertyId],
      queryFn: () => apiClient<Property>(`/api/v1/properties/${propertyId}`),
      staleTime: 60_000,
    })),
  });

  const propertyById = new Map<number, Property>();

  for (const query of propertyQueries) {
    if (query.data) {
      propertyById.set(query.data.property_id, query.data);
    }
  }

  const items: InquiryFeedItem[] = (inquiriesQuery.data ?? []).map((inquiry) => ({
    inquiry,
    property:
      typeof inquiry.property_id === "number"
        ? propertyById.get(inquiry.property_id) ?? null
        : null,
  }));

  return {
    items,
    isLoading:
      inquiriesQuery.isLoading ||
      (propertyIds.length > 0 && propertyQueries.some((query) => query.isLoading)),
    isError:
      inquiriesQuery.isError || propertyQueries.some((query) => query.isError),
    error:
      inquiriesQuery.error ??
      propertyQueries.find((query) => query.error)?.error ??
      null,
    refetch: async () => {
      await inquiriesQuery.refetch();
      await Promise.all(propertyQueries.map((query) => query.refetch()));
    },
  };
}
