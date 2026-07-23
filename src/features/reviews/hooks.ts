import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AgencyReviewCreate,
  AgencyReviewResponse,
  AgentReviewCreate,
  AgentReviewResponse,
  PropertyReviewCreate,
  PropertyReviewResponse,
  ReviewUpdate,
} from "@/types";

export function usePropertyReviews(propertyId?: number | null) {
  return useQuery({
    queryKey: ["propertyReviews", propertyId],
    queryFn: () =>
      apiClient<PropertyReviewResponse[]>(
        `/api/v1/reviews/property/by-property/${propertyId}`,
        { authMode: "omit" },
      ),
    enabled: typeof propertyId === "number",
    staleTime: 30_000,
  });
}

export function useMyPropertyReviews() {
  return useQuery({
    queryKey: ["myPropertyReviews"],
    queryFn: () =>
      apiClient<PropertyReviewResponse[]>("/api/v1/reviews/by-user/property"),
    staleTime: 30_000,
  });
}

export function useMyAgentReviews() {
  return useQuery({
    queryKey: ["myAgentReviews"],
    queryFn: () =>
      apiClient<AgentReviewResponse[]>("/api/v1/reviews/by-user/agent"),
    staleTime: 30_000,
  });
}

export function useCreatePropertyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PropertyReviewCreate) =>
      apiClient<PropertyReviewResponse>("/api/v1/reviews/property", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (review) => {
      await queryClient.invalidateQueries({
        queryKey: ["propertyReviews", review.property_id],
      });
    },
  });
}

export function useUpdatePropertyReview(propertyId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: number;
      payload: ReviewUpdate;
    }) =>
      apiClient<PropertyReviewResponse>(`/api/v1/reviews/property/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["propertyReviews", propertyId] });
    },
  });
}

export function useDeletePropertyReview(propertyId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) =>
      apiClient<PropertyReviewResponse>(`/api/v1/reviews/property/${reviewId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["propertyReviews", propertyId] });
    },
  });
}

export function useAgentReviews(agentId?: number | null) {
  return useQuery({
    queryKey: ["agentReviews", agentId],
    queryFn: () =>
      apiClient<AgentReviewResponse[]>(
        `/api/v1/agent-profiles/${agentId}/reviews`,
        { authMode: "omit" },
      ),
    enabled: typeof agentId === "number",
    staleTime: 30_000,
  });
}

export function useCreateAgentReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgentReviewCreate) =>
      apiClient<AgentReviewResponse>("/api/v1/reviews/agent", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (review) => {
      await queryClient.invalidateQueries({ queryKey: ["agentReviews", review.agent_id] });
    },
  });
}

export function useUpdateAgentReview(agentId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: number;
      payload: ReviewUpdate;
    }) =>
      apiClient<AgentReviewResponse>(`/api/v1/reviews/agent/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agentReviews", agentId] });
    },
  });
}

export function useDeleteAgentReview(agentId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) =>
      apiClient<AgentReviewResponse>(`/api/v1/reviews/agent/${reviewId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agentReviews", agentId] });
    },
  });
}

export function usePropertyReviewsBatch(propertyIds: number[]) {
  return useQueries({
    queries: propertyIds.map((propertyId) => ({
      queryKey: ["propertyReviews", propertyId],
      queryFn: () =>
        apiClient<PropertyReviewResponse[]>(
          `/api/v1/reviews/property/by-property/${propertyId}`,
          { authMode: "omit" },
        ),
      staleTime: 30_000,
      enabled: typeof propertyId === "number",
    })),
    combine: (results) => {
      const allReviews = results
        .flatMap((result) => result.data ?? [])
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      const isLoading = results.some((result) => result.isLoading);
      const isError = results.some((result) => result.isError);
      return { data: allReviews, isLoading, isError };
    },
  });
}

export function useAgentReviewsBatch(agentIds: number[]) {
  return useQueries({
    queries: agentIds.map((agentId) => ({
      queryKey: ["agentReviews", agentId],
      queryFn: () =>
        apiClient<AgentReviewResponse[]>(
          `/api/v1/agent-profiles/${agentId}/reviews`,
          { authMode: "omit" },
        ),
      staleTime: 30_000,
      enabled: typeof agentId === "number",
    })),
    combine: (results) => {
      const allReviews = results
        .flatMap((result) => result.data ?? [])
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      const isLoading = results.some((result) => result.isLoading);
      const isError = results.some((result) => result.isError);
      return { data: allReviews, isLoading, isError };
    },
  });
}

export function useAgencyReviews(agencyId?: number | null) {
  return useQuery({
    queryKey: ["agencyReviews", agencyId],
    queryFn: () =>
      apiClient<AgencyReviewResponse[]>(`/api/v1/reviews/agency/${agencyId}`, {
        authMode: "omit",
      }),
    enabled: typeof agencyId === "number",
    staleTime: 30_000,
  });
}

export function useMyAgencyReviews() {
  return useQuery({
    queryKey: ["myAgencyReviews"],
    queryFn: () =>
      apiClient<AgencyReviewResponse[]>("/api/v1/reviews/by-user/agency"),
    staleTime: 30_000,
  });
}

export function useCreateAgencyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agencyId,
      payload,
    }: {
      agencyId: number;
      payload: AgencyReviewCreate;
    }) =>
      apiClient<AgencyReviewResponse>(`/api/v1/reviews/agency/${agencyId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["agencyReviews", variables.agencyId],
      });
    },
  });
}
