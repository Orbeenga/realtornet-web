import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUsersByIds } from "@/hooks/useUserById";
import type { Inquiry, InquiryStatus, Property, PropertyImage, UserProfile } from "@/types";

export type InquiryDirectorySource = "sent" | "received" | "admin";

export interface InquiryDirectoryItem {
  inquiry: Inquiry;
  property: Property | null;
  propertyImage: PropertyImage | null;
  contact: UserProfile | null;
}

function extractInquiryCollection(payload: Inquiry[] | Record<string, unknown>): Inquiry[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = ["items", "results", "data", "inquiries"];

  for (const key of candidates) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value as Inquiry[];
    }
  }

  return [];
}

async function fetchInquiryCollection(
  source: InquiryDirectorySource,
) {
  if (source === "sent") {
    return apiClient<Inquiry[]>("/api/v1/inquiries/");
  }

  if (source === "received") {
    return apiClient<Inquiry[]>("/api/v1/inquiries/received");
  }

  const payload = await apiClient<Inquiry[] | Record<string, unknown>>(
    "/api/v1/admin/inquiries",
  );

  return extractInquiryCollection(payload);
}

export function useInquiryDirectory(
  source: InquiryDirectorySource,
) {
  const inquiriesQuery = useQuery({
    queryKey: ["inquiryDirectory", source],
    queryFn: () => fetchInquiryCollection(source),
    staleTime: 30_000,
  });

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

  const contactUserIds = useMemo(
    () =>
      [
        ...new Set(
          (inquiriesQuery.data ?? [])
            .map((inquiry) => inquiry.user_id)
            .filter((userId): userId is number => typeof userId === "number"),
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

  const propertyImageQueries = useQueries({
    queries: propertyIds.map((propertyId) => ({
      queryKey: ["propertyImages", propertyId],
      queryFn: () =>
        apiClient<PropertyImage[]>(`/api/v1/property-images/property/${propertyId}`),
      staleTime: 60_000,
    })),
  });

  const contactQueries = useUsersByIds(contactUserIds);

  const propertyById = new Map<number, Property>();

  for (const query of propertyQueries) {
    if (query.data) {
      propertyById.set(query.data.property_id, query.data);
    }
  }

  const primaryImageByPropertyId = new Map<number, PropertyImage | null>();

  for (let index = 0; index < propertyIds.length; index += 1) {
    const propertyId = propertyIds[index];
    const images = propertyImageQueries[index]?.data ?? [];
    primaryImageByPropertyId.set(
      propertyId,
      images.find((image) => image.is_primary) ?? images[0] ?? null,
    );
  }

  const contactByUserId = new Map<number, UserProfile>();

  for (const query of contactQueries) {
    if (query.data) {
      contactByUserId.set(query.data.user_id, query.data);
    }
  }

  const items: InquiryDirectoryItem[] = (inquiriesQuery.data ?? []).map((inquiry) => ({
    inquiry,
    property:
      typeof inquiry.property_id === "number"
        ? propertyById.get(inquiry.property_id) ?? null
        : null,
    propertyImage:
      typeof inquiry.property_id === "number"
        ? primaryImageByPropertyId.get(inquiry.property_id) ?? null
        : null,
    contact:
      typeof inquiry.user_id === "number"
        ? contactByUserId.get(inquiry.user_id) ?? null
        : null,
  }));

  const relatedQueries = [...propertyQueries, ...propertyImageQueries, ...contactQueries];

  return {
    items,
    isLoading:
      inquiriesQuery.isLoading ||
      relatedQueries.some((query) => query.isLoading),
    isError:
      inquiriesQuery.isError ||
      relatedQueries.some((query) => query.isError),
    error:
      inquiriesQuery.error ??
      relatedQueries.find((query) => query.error)?.error ??
      null,
    refetch: async () => {
      await inquiriesQuery.refetch();
      await Promise.all(relatedQueries.map((query) => query.refetch()));
    },
  };
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inquiryId,
      status,
    }: {
      inquiryId: number;
      status: InquiryStatus;
    }) =>
      apiClient<Inquiry>(`/api/v1/inquiries/${inquiryId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          inquiry_status: status,
        }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inquiries"] }),
        queryClient.invalidateQueries({ queryKey: ["inquiryDirectory"] }),
      ]);
    },
  });
}
