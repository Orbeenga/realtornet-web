"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import type { components } from "@/types";

export type Profile = components["schemas"]["ProfileResponse"];
export type ProfileCreate = components["schemas"]["ProfileCreate"];
export type ProfileUpdate = components["schemas"]["ProfileUpdate"];

export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => {
      try {
        return await apiClient<Profile>("/api/v1/profiles/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateUserMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      first_name: string;
      last_name: string;
      phone_number?: string;
    }) =>
      apiClient<components["schemas"]["UserResponse"]>("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    // FE-001: names/phone display on the account surfaces, the B3 signal,
    // the owner roster, and the public directory (B3b visibility flips here).
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["agentProfileByUser"] }),
        queryClient.invalidateQueries({ queryKey: ["agencyAgents"] }),
        queryClient.invalidateQueries({ queryKey: ["agent"] }),
        queryClient.invalidateQueries({ queryKey: ["agentDirectory"] }),
      ]);
    },
  });
}

export function useUpsertMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      hasExistingProfile,
    }: {
      payload: ProfileCreate | ProfileUpdate;
      hasExistingProfile: boolean;
    }) => {
      if (hasExistingProfile) {
        return apiClient<Profile>("/api/v1/profiles/me", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      return apiClient<Profile>("/api/v1/profiles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    },
  });
}

export function useUploadMyAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return apiClient<Profile>("/api/v1/profiles/me/avatar", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    },
  });
}

export function useDeleteMyAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      apiClient<Profile>("/api/v1/profiles/me/avatar", {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    },
  });
}
