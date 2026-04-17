import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyList } from "@/types";

export function useAdminProperties(enabled: boolean) {
  return useQuery({
    queryKey: ["adminProperties"],
    queryFn: async () => {
      // The admin dashboard needs every property, including pending ones, so it
      // deliberately calls the privileged admin endpoint instead of the public feed.
      const response = await apiClient<{ items?: PropertyList } | PropertyList>(
        "/api/v1/admin/properties?skip=0&limit=100",
      );

      if (Array.isArray(response)) {
        return response;
      }

      return response.items ?? [];
    },
    staleTime: 60_000,
    enabled,
  });
}
