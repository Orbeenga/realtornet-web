import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUsersByIds } from "@/hooks/useUserById";
import type {
  Inquiry,
  InquiryExtended,
  InquiryStatus,
  Property,
  PropertyImage,
  UserProfile,
} from "@/types";

export type InquiryDirectorySource = "sent" | "received" | "admin" | "agency";

export interface InquiryDirectoryContact {
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
}

export interface InquiryDirectoryProperty {
  property_id?: number | null;
  title?: string | null;
  [key: string]: unknown;
}

export interface InquiryDirectoryItem {
  inquiry: Inquiry;
  property: InquiryDirectoryProperty | null;
  propertyImage: PropertyImage | null;
  contact: InquiryDirectoryContact | null;
}

type InquiryCollectionPayload =
  | Inquiry[]
  | InquiryExtended[]
  | Record<string, unknown>;

function extractInquiryCollection(
  payload: InquiryCollectionPayload,
): Array<Inquiry | InquiryExtended> {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = ["items", "results", "data", "inquiries"];

  for (const key of candidates) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value as Array<Inquiry | InquiryExtended>;
    }
  }

  return [];
}

async function fetchInquiryCollection(
  source: InquiryDirectorySource,
  agencyId?: number,
) {
  if (source === "sent") {
    return apiClient<Inquiry[]>("/api/v1/inquiries/");
  }

  if (source === "received") {
    return apiClient<Inquiry[]>("/api/v1/inquiries/received/");
  }

  if (source === "agency") {
    if (typeof agencyId !== "number") {
      return [];
    }

    return apiClient<InquiryExtended[]>(
      `/api/v1/agencies/${agencyId}/inquiries/?page_size=100`,
    );
  }

  const payload = await apiClient<Inquiry[] | Record<string, unknown>>(
    "/api/v1/admin/inquiries/",
  );

  return extractInquiryCollection(payload);
}

function getContactFromProfile(profile: UserProfile): InquiryDirectoryContact {
  return {
    fullName: `${profile.first_name} ${profile.last_name}`.trim() || "Seeker",
    email: profile.email,
    phoneNumber: profile.phone_number,
  };
}

function getContactFromExtendedInquiry(
  inquiry: Inquiry | InquiryExtended,
): InquiryDirectoryContact | null {
  const record = inquiry as Record<string, unknown>;
  const candidate = record.user ?? record.seeker ?? record.contact;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const contact = candidate as Record<string, unknown>;
  const firstName = typeof contact.first_name === "string" ? contact.first_name : "";
  const lastName = typeof contact.last_name === "string" ? contact.last_name : "";
  const fullName =
    (typeof contact.full_name === "string" && contact.full_name.trim()) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Seeker";

  return {
    fullName,
    email: typeof contact.email === "string" ? contact.email : null,
    phoneNumber:
      typeof contact.phone_number === "string"
        ? contact.phone_number
        : typeof contact.phoneNumber === "string"
          ? contact.phoneNumber
          : null,
  };
}

function getPropertyFromExtendedInquiry(
  inquiry: Inquiry | InquiryExtended,
): InquiryDirectoryProperty | null {
  if (
    !("property" in inquiry) ||
    !inquiry.property ||
    typeof inquiry.property !== "object"
  ) {
    return null;
  }

  return inquiry.property as InquiryDirectoryProperty;
}

function getPropertyImageFromExtendedInquiry(
  inquiry: Inquiry | InquiryExtended,
): PropertyImage | null {
  const property = getPropertyFromExtendedInquiry(inquiry) as
    | (InquiryDirectoryProperty & {
        primary_image?: PropertyImage | null;
        image?: PropertyImage | null;
        images?: PropertyImage[];
      })
    | null;

  if (!property) {
    return null;
  }

  return (
    property.primary_image ??
    property.image ??
    property.images?.find((image) => image.is_primary) ??
    property.images?.[0] ??
    null
  );
}

export function useInquiryDirectory(
  source: InquiryDirectorySource,
  options?: { agencyId?: number },
) {
  const canFetch = source !== "agency" || typeof options?.agencyId === "number";
  const useEmbeddedReceivedData = source === "received";
  const inquiriesQuery = useQuery({
    queryKey: ["inquiryDirectory", source, options?.agencyId ?? null],
    queryFn: () => fetchInquiryCollection(source, options?.agencyId),
    staleTime: 30_000,
    enabled: canFetch,
  });
  const inquiries = useMemo(
    () => (inquiriesQuery.data ?? []) as Array<Inquiry | InquiryExtended>,
    [inquiriesQuery.data],
  );

  const extendedPropertyById = useMemo(() => {
    const properties = new Map<number, InquiryDirectoryProperty>();

    inquiries.forEach((inquiry) => {
      const property = getPropertyFromExtendedInquiry(inquiry);
      const propertyId =
        typeof property?.property_id === "number"
          ? property.property_id
          : inquiry.property_id;

      if (typeof propertyId === "number" && property) {
        properties.set(propertyId, property);
      }
    });

    return properties;
  }, [inquiries]);

  const extendedContactByUserId = useMemo(() => {
    const contacts = new Map<number, InquiryDirectoryContact>();

    inquiries.forEach((inquiry) => {
      if (typeof inquiry.user_id !== "number") {
        return;
      }

      const contact = getContactFromExtendedInquiry(inquiry);

      if (contact) {
        contacts.set(inquiry.user_id, contact);
      }
    });

    return contacts;
  }, [inquiries]);

  const propertyIds = useMemo(
    () =>
      [
        ...new Set(
          inquiries
            .map((inquiry) => inquiry.property_id)
            .filter((propertyId): propertyId is number => typeof propertyId === "number"),
        ),
      ].sort((left, right) => left - right),
    [inquiries],
  );

  const propertyIdsNeedingDetail = useMemo(
    () =>
      useEmbeddedReceivedData
        ? []
        : propertyIds.filter((propertyId) => !extendedPropertyById.has(propertyId)),
    [extendedPropertyById, propertyIds, useEmbeddedReceivedData],
  );

  const contactUserIds = useMemo(
    () =>
      useEmbeddedReceivedData
        ? []
        : [
            ...new Set(
              inquiries
                .map((inquiry) => inquiry.user_id)
                .filter(
                  (userId): userId is number =>
                    typeof userId === "number" && !extendedContactByUserId.has(userId),
                ),
            ),
          ].sort((left, right) => left - right),
    [extendedContactByUserId, inquiries, useEmbeddedReceivedData],
  );

  const propertyQueries = useQueries({
    queries: propertyIdsNeedingDetail.map((propertyId) => ({
      queryKey: ["property", propertyId],
      queryFn: () => apiClient<Property>(`/api/v1/properties/${propertyId}/`),
      staleTime: 60_000,
    })),
  });

  const propertyImageQueries = useQueries({
    queries: useEmbeddedReceivedData
      ? []
      : propertyIds.map((propertyId) => ({
          queryKey: ["propertyImages", propertyId],
          queryFn: () =>
            apiClient<PropertyImage[]>(`/api/v1/property-images/property/${propertyId}/`),
          staleTime: 60_000,
        })),
  });

  const contactQueries = useUsersByIds(contactUserIds);

  const propertyById = new Map<number, InquiryDirectoryProperty>(
    extendedPropertyById,
  );

  for (const query of propertyQueries) {
    if (query.data) {
      propertyById.set(query.data.property_id, query.data);
    }
  }

  const primaryImageByPropertyId = new Map<number, PropertyImage | null>();

  inquiries.forEach((inquiry) => {
    const image = getPropertyImageFromExtendedInquiry(inquiry);

    if (typeof inquiry.property_id === "number" && image) {
      primaryImageByPropertyId.set(inquiry.property_id, image);
    }
  });

  if (!useEmbeddedReceivedData) {
    for (let index = 0; index < propertyIds.length; index += 1) {
      const propertyId = propertyIds[index];
      const images = propertyImageQueries[index]?.data ?? [];
      primaryImageByPropertyId.set(
        propertyId,
        images.find((image) => image.is_primary) ?? images[0] ?? null,
      );
    }
  }

  const contactByUserId = new Map<number, InquiryDirectoryContact>(
    extendedContactByUserId,
  );

  for (const query of contactQueries) {
    if (query.data) {
      contactByUserId.set(query.data.user_id, getContactFromProfile(query.data));
    }
  }

  const items: InquiryDirectoryItem[] = inquiries.map((inquiry) => ({
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
  const hasInquiries = inquiries.length > 0;
  const hasLoadedEmpty = !canFetch || (inquiriesQuery.isSuccess && !hasInquiries);

  return {
    items,
    isLoading:
      (canFetch && inquiriesQuery.isLoading) ||
      relatedQueries.some((query) => query.isLoading),
    isError: inquiriesQuery.isError,
    hasLoadedEmpty,
    error: inquiriesQuery.error ?? null,
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
      apiClient<Inquiry>(`/api/v1/inquiries/${inquiryId}/status/`, {
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

export function useMarkInquiryViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryId: number) =>
      apiClient<Inquiry>(`/api/v1/inquiries/${inquiryId}/mark-viewed/`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inquiries"] }),
        queryClient.invalidateQueries({ queryKey: ["inquiryDirectory"] }),
      ]);
    },
  });
}
