import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyType } from "@/types";

export function usePropertyTypes() {
  return useQuery({
    queryKey: ["propertyTypes"],
    queryFn: () => apiClient<PropertyType[]>("/api/v1/property-types/"),
    staleTime: 60_000,
  });
}
