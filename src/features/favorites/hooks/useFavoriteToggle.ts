import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Favorite, FavoriteCreate } from "@/types";

interface ToggleArgs {
  propertyId: number;
  isFavorited: boolean;
}

export function useFavoriteToggle() {
  const queryClient = useQueryClient();

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

      const favoriteEntries = queryClient.getQueriesData<Favorite[]>({
        queryKey: ["favorites"],
      });

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

      return { favoriteEntries };
    },
    onError: (_error, _variables, context) => {
      context?.favoriteEntries.forEach(([queryKey, favorites]) => {
        queryClient.setQueryData(queryKey, favorites);
      });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({
        queryKey: ["property", variables.propertyId],
      });
    },
  });
}
