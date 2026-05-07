import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Location } from "@/types";

interface LocationFilters {
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  enabled?: boolean;
}

function buildLocationQuery(filters: Omit<LocationFilters, "enabled">) {
  const params = new URLSearchParams();

  if (filters.state) {
    params.set("state", filters.state);
  }

  if (filters.city) {
    params.set("city", filters.city);
  }

  if (filters.neighborhood) {
    params.set("neighborhood", filters.neighborhood);
  }

  params.set("limit", "100");

  return `?${params.toString()}`;
}

export function useLocationStates() {
  return useQuery({
    queryKey: ["locations", "states"],
    queryFn: () =>
      apiClient<string[]>("/api/v1/locations/states", { authMode: "omit" }),
    staleTime: 10 * 60_000,
  });
}

export function useLocationCities(state?: string | null) {
  return useQuery({
    queryKey: ["locations", "cities", state ?? null],
    queryFn: () =>
      apiClient<string[]>(
        `/api/v1/locations/cities?state=${encodeURIComponent(state ?? "")}`,
        { authMode: "omit" },
      ),
    enabled: Boolean(state),
    staleTime: 10 * 60_000,
  });
}

export function useLocationNeighborhoods(
  state?: string | null,
  city?: string | null,
) {
  const params = new URLSearchParams();

  if (state) {
    params.set("state", state);
  }

  if (city) {
    params.set("city", city);
  }

  return useQuery({
    queryKey: ["locations", "neighborhoods", state ?? null, city ?? null],
    queryFn: () =>
      apiClient<string[]>(`/api/v1/locations/neighborhoods?${params.toString()}`, {
        authMode: "omit",
      }),
    enabled: Boolean(city),
    staleTime: 10 * 60_000,
  });
}

export function useLocationsByHierarchy({
  state,
  city,
  neighborhood,
  enabled = true,
}: LocationFilters = {}) {
  return useQuery({
    queryKey: [
      "locations",
      "hierarchy",
      state ?? null,
      city ?? null,
      neighborhood ?? null,
    ],
    queryFn: () =>
      apiClient<Location[]>(
        `/api/v1/locations/${buildLocationQuery({ state, city, neighborhood })}`,
        { authMode: "omit" },
      ),
    enabled,
    staleTime: 10 * 60_000,
  });
}
