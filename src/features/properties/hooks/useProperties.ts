import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PaginatedProperties, PropertyFilters } from "@/types";

function buildPropertyQuery(filters: PropertyFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    if (key === "page_size") {
      params.set("limit", String(value));
      return;
    }

    if (key === "page") {
      const page = Number(value);
      const pageSize = Number(filters.page_size ?? 20);
      params.set("skip", String(Math.max(0, page - 1) * pageSize));
      return;
    }

    if (key === "property_type") {
      params.set("listing_type", String(value));
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
