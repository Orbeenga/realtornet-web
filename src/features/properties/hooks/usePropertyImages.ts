import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyImage } from "@/types";

export function usePropertyImages(propertyId?: number | null) {
  return useQuery({
    queryKey: ["propertyImages", propertyId],
    queryFn: () =>
      apiClient<PropertyImage[]>(
        `/api/v1/property-images/property/${propertyId}`,
      ),
    staleTime: 60_000,
    enabled: typeof propertyId === "number",
  });
}

export function useUploadPropertyImage(propertyId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      caption,
      isPrimary,
    }: {
      file: File;
      caption?: string;
      isPrimary?: boolean;
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      if (caption) {
        formData.append("caption", caption);
      }

      if (typeof isPrimary === "boolean") {
        formData.append("is_primary", String(isPrimary));
      }

      return apiClient<PropertyImage>(
        `/api/v1/property-images/property/${propertyId}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["propertyImages", propertyId],
      });
    },
  });
}

export function useDeletePropertyImage(propertyId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: number) =>
      apiClient<{ detail?: string; message?: string }>(
        `/api/v1/property-images/${imageId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["propertyImages", propertyId],
      });
    },
  });
}

export function useSetPrimaryImage(propertyId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: number) =>
      apiClient<PropertyImage>(`/api/v1/property-images/${imageId}/set-primary`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["propertyImages", propertyId],
      });
    },
  });
}

export function useReorderPropertyImages(propertyId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageIds: number[]) =>
      apiClient<PropertyImage[]>(
        `/api/v1/property-images/property/${propertyId}/reorder`,
        {
          method: "PUT",
          body: JSON.stringify(imageIds),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["propertyImages", propertyId],
      });
    },
  });
}

export function useUpdateImageMetadata(propertyId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageId,
      caption,
      isPrimary,
      displayOrder,
    }: {
      imageId: number;
      caption?: string | null;
      isPrimary?: boolean;
      displayOrder?: number;
    }) =>
      apiClient<PropertyImage>(`/api/v1/property-images/${imageId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...(caption !== undefined ? { caption } : {}),
          ...(typeof isPrimary === "boolean" ? { is_primary: isPrimary } : {}),
          ...(typeof displayOrder === "number"
            ? { display_order: displayOrder }
            : {}),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["propertyImages", propertyId],
      });
    },
  });
}
