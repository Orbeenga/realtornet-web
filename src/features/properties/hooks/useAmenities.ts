import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Amenity } from "@/types";

type SyncAmenitiesArgs =
  | number[]
  | {
      propertyId: number;
      amenityIds: number[];
    };

export function useAmenities() {
  return useQuery({
    queryKey: ["amenities"],
    queryFn: () =>
      apiClient<Amenity[]>("/api/v1/amenities/", { authMode: "omit" }),
    staleTime: 300_000,
  });
}

export function useAmenityCategories() {
  return useQuery({
    queryKey: ["amenity-categories"],
    queryFn: () =>
      apiClient<string[]>("/api/v1/amenities/categories", { authMode: "omit" }),
    staleTime: 300_000,
  });
}

export function usePropertyAmenities(propertyId?: number | null) {
  return useQuery({
    queryKey: ["property-amenities", propertyId],
    queryFn: () =>
      apiClient<Amenity[]>(
        `/api/v1/property-amenities/property/${propertyId}`,
        { authMode: "omit" },
      ),
    enabled: typeof propertyId === "number",
    staleTime: 60_000,
  });
}

export function useSyncPropertyAmenities(propertyId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: SyncAmenitiesArgs) => {
      const targetPropertyId = Array.isArray(args) ? propertyId : args.propertyId;
      const amenityIds = Array.isArray(args) ? args : args.amenityIds;

      if (typeof targetPropertyId !== "number") {
        throw new Error("Property ID is required to sync amenities");
      }

      return apiClient<Amenity[]>(
        `/api/v1/property-amenities/property/${targetPropertyId}/sync`,
        {
          method: "PUT",
          body: JSON.stringify(amenityIds),
        },
      );
    },
    onSuccess: async (_data, args) => {
      const targetPropertyId = Array.isArray(args) ? propertyId : args.propertyId;

      if (typeof targetPropertyId === "number") {
        await queryClient.invalidateQueries({
          queryKey: ["property-amenities", targetPropertyId],
        });
      }
    },
  });
}
