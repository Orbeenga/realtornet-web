import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Property, SavedSearch, SavedSearchCreateInput } from "@/types";

const SAVED_SEARCHES_QUERY_KEY = ["saved-searches"] as const;

export function useSavedSearches() {
  return useQuery({
    queryKey: SAVED_SEARCHES_QUERY_KEY,
    queryFn: () => apiClient<SavedSearch[]>("/api/v1/saved-searches/"),
    staleTime: 60_000,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SavedSearchCreateInput) =>
      apiClient<SavedSearch>("/api/v1/saved-searches/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_QUERY_KEY });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (searchId: number) =>
      apiClient<SavedSearch>(`/api/v1/saved-searches/${searchId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_QUERY_KEY });
    },
  });
}

export function useExecuteSavedSearch() {
  return useMutation({
    mutationFn: (searchId: number) =>
      apiClient<Property[]>(`/api/v1/saved-searches/${searchId}/execute`, {
        method: "POST",
      }),
  });
}
