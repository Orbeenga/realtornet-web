import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
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
      ),
    enabled: typeof propertyId === "number",
    staleTime: 30_000,
  });
}

export function useCreatePropertyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PropertyReviewCreate) =>
      apiClient<PropertyReviewResponse>("/api/v1/reviews/property/", {
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
        `/api/v1/reviews/agent/by-agent/${agentId}`,
      ),
    enabled: typeof agentId === "number",
    staleTime: 30_000,
  });
}

export function useCreateAgentReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgentReviewCreate) =>
      apiClient<AgentReviewResponse>("/api/v1/reviews/agent/", {
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
