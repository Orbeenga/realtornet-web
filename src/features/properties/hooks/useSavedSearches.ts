import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type {
  Property,
  SavedSearch,
  SavedSearchCreateInput,
  SavedSearchUpdateInput,
} from "@/types";

const SAVED_SEARCHES_QUERY_KEY = ["saved-searches"] as const;

export function useSavedSearches() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: SAVED_SEARCHES_QUERY_KEY,
    queryFn: () => apiClient<SavedSearch[]>("/api/v1/saved-searches/"),
    staleTime: 60_000,
    enabled: typeof profile?.user_id === "number",
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

export function useSavedSearchDetail(searchId?: number | null) {
  return useQuery({
    queryKey: [...SAVED_SEARCHES_QUERY_KEY, searchId],
    queryFn: () =>
      apiClient<SavedSearch>(`/api/v1/saved-searches/${searchId}`),
    staleTime: 60_000,
    enabled: typeof searchId === "number",
  });
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      searchId,
      payload,
    }: {
      searchId: number;
      payload: SavedSearchUpdateInput;
    }) =>
      apiClient<SavedSearch>(`/api/v1/saved-searches/${searchId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (savedSearch) => {
      queryClient.setQueryData(
        [...SAVED_SEARCHES_QUERY_KEY, savedSearch.search_id],
        savedSearch,
      );
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
