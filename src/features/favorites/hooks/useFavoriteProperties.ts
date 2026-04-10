import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useFavorites } from "@/features/favorites/hooks/useFavorites";
import type { Property } from "@/types";

export function useFavoriteProperties() {
  const favoritesQuery = useFavorites();
  const propertyIds = useMemo(
    () =>
      [...new Set((favoritesQuery.data ?? []).map((favorite) => favorite.property_id))].sort(
        (left, right) => left - right,
      ),
    [favoritesQuery.data],
  );

  const propertyQueries = useQueries({
    queries: propertyIds.map((propertyId) => ({
      queryKey: ["property", propertyId],
      queryFn: () => apiClient<Property>(`/api/v1/properties/${propertyId}`),
      staleTime: 60_000,
    })),
  });

  const properties = propertyQueries
    .map((query) => query.data)
    .filter((property): property is Property => Boolean(property));

  return {
    favorites: favoritesQuery.data ?? [],
    properties,
    isLoading:
      favoritesQuery.isLoading ||
      (propertyIds.length > 0 && propertyQueries.some((query) => query.isLoading)),
    isError:
      favoritesQuery.isError || propertyQueries.some((query) => query.isError),
    error:
      favoritesQuery.error ??
      propertyQueries.find((query) => query.error)?.error ??
      null,
    refetch: async () => {
      await favoritesQuery.refetch();
      await Promise.all(propertyQueries.map((query) => query.refetch()));
    },
  };
}
