"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Input } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { notify } from "@/lib/toast";
import type { AgentReviewResponse, PropertyReviewResponse, ReviewUpdate } from "@/types";
import {
  useAgentReviews,
  useCreateAgentReview,
  useCreatePropertyReview,
  useDeleteAgentReview,
  useDeletePropertyReview,
  usePropertyReviews,
  useUpdateAgentReview,
  useUpdatePropertyReview,
} from "./hooks";

const reviewSchema = z.object({
  rating: z.coerce.number().min(1, "Choose a rating from 1 to 5").max(5, "Choose a rating from 1 to 5"),
  comment: z.string().max(1000, "Keep reviews under 1000 characters").optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;
type ReviewFormInput = z.input<typeof reviewSchema>;
type ReviewTarget = "property" | "agent";
type ReviewRecord = PropertyReviewResponse | AgentReviewResponse;

interface ReviewSectionProps {
  target: ReviewTarget;
  targetId: number;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError && typeof error.detail === "string"
    ? error.detail
    : fallback;
}

function ReviewForm({
  initialValues,
  isSubmitting,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initialValues?: ReviewFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: ReviewFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormInput, unknown, ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: initialValues ?? {
      rating: 5,
      comment: "",
    },
  });

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <Input
        label="Rating"
        type="number"
        min={1}
        max={5}
        step={1}
        error={errors.rating?.message}
        {...register("rating")}
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="review-comment"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Comment
        </label>
        <textarea
          id="review-comment"
          rows={4}
          className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Share what future clients should know"
          {...register("comment")}
        />
        {errors.comment?.message ? (
          <p className="text-xs text-red-600" role="alert">
            {errors.comment.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ReviewSection({ target, targetId }: ReviewSectionProps) {
  const { user } = useAuth();
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const propertyReviewsQuery = usePropertyReviews(target === "property" ? targetId : null);
  const agentReviewsQuery = useAgentReviews(target === "agent" ? targetId : null);
  const createPropertyReview = useCreatePropertyReview();
  const updatePropertyReview = useUpdatePropertyReview(target === "property" ? targetId : null);
  const deletePropertyReview = useDeletePropertyReview(target === "property" ? targetId : null);
  const createAgentReview = useCreateAgentReview();
  const updateAgentReview = useUpdateAgentReview(target === "agent" ? targetId : null);
  const deleteAgentReview = useDeleteAgentReview(target === "agent" ? targetId : null);

  const reviewsQuery = target === "property" ? propertyReviewsQuery : agentReviewsQuery;
  const reviews = useMemo(
    () => (reviewsQuery.data ?? []) as ReviewRecord[],
    [reviewsQuery.data],
  );
  const ownReview = reviews.find((review) => review.user_id === user?.user_id);
  const editingReview = reviews.find((review) => review.review_id === editingReviewId);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length
      : null;

  const handleCreate = async (values: ReviewFormValues) => {
    try {
      if (target === "property") {
        await createPropertyReview.mutateAsync({
          property_id: targetId,
          rating: values.rating,
          comment: values.comment?.trim() || null,
        });
      } else {
        await createAgentReview.mutateAsync({
          agent_id: targetId,
          rating: values.rating,
          comment: values.comment?.trim() || null,
        });
      }
      notify.success("Review submitted");
    } catch (error) {
      notify.error(getErrorMessage(error, "Could not submit review"));
    }
  };

  const handleUpdate = async (reviewId: number, values: ReviewFormValues) => {
    const payload: ReviewUpdate = {
      rating: values.rating,
      comment: values.comment?.trim() || null,
    };

    try {
      if (target === "property") {
        await updatePropertyReview.mutateAsync({ reviewId, payload });
      } else {
        await updateAgentReview.mutateAsync({ reviewId, payload });
      }
      setEditingReviewId(null);
      notify.success("Review updated");
    } catch (error) {
      notify.error(getErrorMessage(error, "Could not update review"));
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm("Delete this review?")) {
      return;
    }

    try {
      if (target === "property") {
        await deletePropertyReview.mutateAsync(reviewId);
      } else {
        await deleteAgentReview.mutateAsync(reviewId);
      }
      notify.success("Review deleted");
    } catch (error) {
      notify.error(getErrorMessage(error, "Could not delete review"));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Reviews
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
            {averageRating ? `, ${averageRating.toFixed(1)} average rating` : ""}
          </p>
        </div>
        {averageRating ? <Badge>{averageRating.toFixed(1)} / 5</Badge> : null}
      </div>

      {reviewsQuery.isError ? (
        <ErrorState
          title="Could not load reviews"
          message="There was a problem loading reviews for this profile."
          onRetry={() => {
            void reviewsQuery.refetch();
          }}
        />
      ) : null}

      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="The first review for this profile will appear here."
        />
      ) : null}

      {reviews.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <Card key={review.review_id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Badge>{review.rating} / 5</Badge>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(review.created_at)}
                  </p>
                </div>
                {editingReviewId === review.review_id ? (
                  <ReviewForm
                    initialValues={{
                      rating: Number(review.rating),
                      comment: review.comment ?? "",
                    }}
                    isSubmitting={updatePropertyReview.isPending || updateAgentReview.isPending}
                    submitLabel="Save review"
                    onCancel={() => setEditingReviewId(null)}
                    onSubmit={(values) => void handleUpdate(review.review_id, values)}
                  />
                ) : (
                  <>
                    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {review.comment || "No written comment."}
                    </p>
                    {review.user_id === user?.user_id ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingReviewId(review.review_id)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          loading={
                            deletePropertyReview.isPending || deleteAgentReview.isPending
                          }
                          onClick={() => void handleDelete(review.review_id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      {user && !ownReview ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Leave a review
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Share a rating and optional note from your account.
              </p>
            </div>
            <ReviewForm
              isSubmitting={createPropertyReview.isPending || createAgentReview.isPending}
              submitLabel="Submit review"
              onSubmit={(values) => void handleCreate(values)}
            />
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}
