import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ListingEventResponse } from "@/types";

export function useListingEvents(propertyId: number | null) {
  return useQuery({
    queryKey: ["listingEvents", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return apiClient<ListingEventResponse[]>(
        `/api/v1/properties/${propertyId}/events`,
      );
    },
    staleTime: 60_000,
    enabled: propertyId !== null,
  });
}
