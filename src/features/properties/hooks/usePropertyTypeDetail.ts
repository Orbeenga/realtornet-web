import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyType } from "@/types";

export function usePropertyTypeDetail(propertyTypeId?: number | null) {
  return useQuery({
    queryKey: ["propertyType", propertyTypeId],
    queryFn: () =>
      apiClient<PropertyType>(`/api/v1/property-types/${propertyTypeId}`),
    staleTime: 60_000,
    enabled: typeof propertyTypeId === "number",
  });
}
