import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PaginatedProperties, PropertyFilters, PropertyList } from "@/types";

function buildPropertyQuery(filters: PropertyFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && String(v) !== "") {
          params.append(key, String(v));
        }
      });
      return;
    }

    params.set(key, String(value));
  });

  return params.toString() ? `?${params.toString()}` : "";
}

export { buildPropertyQuery };

export function useProperties(
  filters: PropertyFilters = {},
  initialData?: PaginatedProperties | null,
) {
  const query = buildPropertyQuery(filters);

  return useQuery({
    queryKey: ["properties", filters],
    queryFn: () =>
      apiClient<PaginatedProperties>(`/api/v1/properties/${query}`, {
        authMode: "omit",
      }),
    staleTime: 60_000,
    initialData: initialData ?? undefined,
  });
}

export function useFeaturedProperties(
  limit = 6,
  initialData?: PropertyList | null,
) {
  return useQuery({
    queryKey: ["featuredProperties", limit],
    queryFn: () =>
      apiClient<PropertyList>(
        `/api/v1/properties/?page=1&page_size=${limit}&limit=${limit}&moderation_status=verified`,
        {
          authMode: "omit",
        },
      ),
    staleTime: 60_000,
    initialData: initialData ?? undefined,
  });
}
