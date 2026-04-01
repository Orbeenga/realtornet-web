import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { Favorite, FavoriteCreate } from "@/types";

export function useFavorites() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ["favorites", profile?.user_id],
    queryFn: () =>
      apiClient<Favorite[]>(`/api/v1/favorites/user/${profile?.user_id}`),
    staleTime: 30_000,
    enabled: typeof profile?.user_id === "number",
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: number) =>
      apiClient<Favorite>("/api/v1/favorites/", {
        method: "POST",
        body: JSON.stringify({ property_id: propertyId } satisfies FavoriteCreate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: number) =>
      apiClient<Favorite>(`/api/v1/favorites/?property_id=${propertyId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
