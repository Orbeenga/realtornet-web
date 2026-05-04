import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { Favorite, FavoriteCreate } from "@/types";

interface FavoriteCountResponse {
  count?: number;
  favorite_count?: number;
  total?: number;
  [key: string]: unknown;
}

interface IsFavoritedResponse {
  is_favorited?: boolean;
  favorited?: boolean;
  exists?: boolean;
  [key: string]: unknown;
}

function normalizeFavoriteCount(response: FavoriteCountResponse) {
  const value =
    response.count ??
    response.favorite_count ??
    response.total;

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeIsFavorited(response: IsFavoritedResponse) {
  return Boolean(
    response.is_favorited ??
      response.favorited ??
      response.exists,
  );
}

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

export function useFavoriteCount(propertyId?: number | null) {
  return useQuery({
    queryKey: ["favoriteCount", propertyId],
    queryFn: async () => {
      const response = await apiClient<FavoriteCountResponse>(
        `/api/v1/favorites/count/${propertyId}`,
      );

      return normalizeFavoriteCount(response);
    },
    staleTime: 30_000,
    enabled: typeof propertyId === "number",
  });
}

export function useIsFavorited(propertyId?: number | null) {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ["isFavorited", propertyId, profile?.user_id],
    queryFn: async () => {
      const response = await apiClient<IsFavoritedResponse>(
        `/api/v1/favorites/is-favorited?property_id=${propertyId}`,
      );

      return normalizeIsFavorited(response);
    },
    staleTime: 30_000,
    enabled: typeof propertyId === "number" && typeof profile?.user_id === "number",
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
      queryClient.invalidateQueries({ queryKey: ["favoriteCount"] });
      queryClient.invalidateQueries({ queryKey: ["isFavorited"] });
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
      queryClient.invalidateQueries({ queryKey: ["favoriteCount"] });
      queryClient.invalidateQueries({ queryKey: ["isFavorited"] });
    },
  });
}
