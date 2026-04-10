import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PaginatedProperties, PropertyFilters } from "@/types";

function buildPropertyQuery(filters: PropertyFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  return params.toString() ? `?${params.toString()}` : "";
}

export function useProperties(filters: PropertyFilters = {}) {
  const query = buildPropertyQuery(filters);

  return useQuery({
    queryKey: ["properties", filters],
    queryFn: () => apiClient<PaginatedProperties>(`/api/v1/properties/${query}`),
    staleTime: 60_000,
  });
}
