import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { Favorite, FavoriteCreate } from "@/types";

interface ToggleArgs {
  propertyId: number;
  isFavorited: boolean;
}

export function useFavoriteToggle() {
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile();

  return useMutation({
    mutationFn: async ({ propertyId, isFavorited }: ToggleArgs) => {
      if (isFavorited) {
        return apiClient<Favorite>(`/api/v1/favorites/?property_id=${propertyId}`, {
          method: "DELETE",
        });
      }

      return apiClient<Favorite>("/api/v1/favorites/", {
        method: "POST",
        body: JSON.stringify({ property_id: propertyId } satisfies FavoriteCreate),
      });
    },
    onMutate: async ({ propertyId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      await queryClient.cancelQueries({ queryKey: ["favoriteCount", propertyId] });
      await queryClient.cancelQueries({
        queryKey: ["isFavorited", propertyId, profile?.user_id],
      });

      const favoriteEntries = queryClient.getQueriesData<Favorite[]>({
        queryKey: ["favorites"],
      });
      const previousFavoriteCount = queryClient.getQueryData<number>([
        "favoriteCount",
        propertyId,
      ]);
      const previousIsFavorited = queryClient.getQueryData<boolean>([
        "isFavorited",
        propertyId,
        profile?.user_id,
      ]);

      for (const [queryKey, favorites] of favoriteEntries) {
        if (!favorites) {
          continue;
        }

        const nextFavorites = isFavorited
          ? favorites.filter((favorite) => favorite.property_id !== propertyId)
          : [
              ...favorites,
              {
                property_id: propertyId,
                user_id: favorites[0]?.user_id ?? 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
                deleted_by: null,
              },
            ];

        queryClient.setQueryData(queryKey, nextFavorites);
      }

      queryClient.setQueryData(
        ["favoriteCount", propertyId],
        Math.max(0, (previousFavoriteCount ?? 0) + (isFavorited ? -1 : 1)),
      );
      queryClient.setQueryData(
        ["isFavorited", propertyId, profile?.user_id],
        !isFavorited,
      );

      return { favoriteEntries, previousFavoriteCount, previousIsFavorited };
    },
    onError: (_error, variables, context) => {
      context?.favoriteEntries.forEach(([queryKey, favorites]) => {
        queryClient.setQueryData(queryKey, favorites);
      });
      queryClient.setQueryData(
        ["favoriteCount", variables.propertyId],
        context?.previousFavoriteCount,
      );
      queryClient.setQueryData(
        ["isFavorited", variables.propertyId, profile?.user_id],
        context?.previousIsFavorited,
      );
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({
        queryKey: ["favoriteCount", variables.propertyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["isFavorited", variables.propertyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["property", variables.propertyId],
      });
    },
  });
}
