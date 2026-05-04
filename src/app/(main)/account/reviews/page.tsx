"use client";

import { useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import {
  useMyAgentReviews,
  useMyPropertyReviews,
} from "@/features/reviews/hooks";
import { cn } from "@/lib/utils";
import type { AgentReviewResponse, PropertyReviewResponse } from "@/types";

type ReviewTab = "property" | "agent";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ReviewSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  label,
}: {
  review: PropertyReviewResponse | AgentReviewResponse;
  label: string;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-950 dark:text-white">
            {label}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {review.comment?.trim() || "No written comment."}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          {review.rating}/5
        </span>
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Submitted {formatDate(review.created_at)}
      </p>
    </article>
  );
}

export default function AccountReviewsPage() {
  const [activeTab, setActiveTab] = useState<ReviewTab>("property");
  const propertyReviewsQuery = useMyPropertyReviews();
  const agentReviewsQuery = useMyAgentReviews();
  const activeQuery =
    activeTab === "property" ? propertyReviewsQuery : agentReviewsQuery;
  const reviews = activeQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          My reviews
        </h1>
      </div>

      <div
        className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-950"
        role="tablist"
        aria-label="Review type"
      >
        {[
          { id: "property" as const, label: "Property reviews" },
          { id: "agent" as const, label: "Agent reviews" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeQuery.isLoading ? <ReviewSkeleton /> : null}

      {!activeQuery.isLoading && activeQuery.isError ? (
        <ErrorState
          title="Could not load reviews"
          message="There was a problem loading your reviews. Please try again."
          onRetry={() => {
            void activeQuery.refetch();
          }}
        />
      ) : null}

      {!activeQuery.isLoading && !activeQuery.isError && reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Reviews you submit will appear here."
        />
      ) : null}

      {!activeQuery.isLoading && !activeQuery.isError && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.review_id}
              review={review}
              label={
                activeTab === "property"
                  ? `Property #${(review as PropertyReviewResponse).property_id}`
                  : `Agent #${(review as AgentReviewResponse).agent_id}`
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
