"use client";

import { useMemo, useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { normalizeAppRole } from "@/features/auth/navigation";
import { useAgencyAgents } from "@/features/agencies/hooks";
import { useAgentProfileByUser } from "@/features/properties/hooks";
import {
  useMyAgentReviews,
  useMyPropertyReviews,
  useMyAgencyReviews,
  usePropertyReviewsBatch,
  useAgentReviews,
  useAgentReviewsBatch,
  useAgencyReviews,
} from "@/features/reviews/hooks";
import { useAgencyOwnerListings, useOwnerListings } from "@/features/properties/hooks";
import { cn } from "@/lib/utils";
import type {
  AgencyReviewResponse,
  AgentReviewResponse,
  PropertyReviewResponse,
} from "@/types";

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
  review: PropertyReviewResponse | AgentReviewResponse | AgencyReviewResponse;
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

/* ─── Seeker view ─── */

type SeekerTab = "property" | "agent" | "agency";

function SeekerReviewsView() {
  const [activeTab, setActiveTab] = useState<SeekerTab>("property");
  const propertyReviewsQuery = useMyPropertyReviews();
  const agentReviewsQuery = useMyAgentReviews();
  const agencyReviewsQuery = useMyAgencyReviews();

  const activeQuery =
    activeTab === "property"
      ? propertyReviewsQuery
      : activeTab === "agent"
        ? agentReviewsQuery
        : agencyReviewsQuery;
  const reviews = activeQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          My Reviews
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
          { id: "agency" as const, label: "Agency reviews" },
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
                  : activeTab === "agent"
                    ? `Agent #${(review as AgentReviewResponse).agent_id}`
                    : `Agency #${(review as AgencyReviewResponse).agency_id}`
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Agent view ─── */

type AgentTab = "listings" | "me";

function AgentReceivedReviewsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AgentTab>("me");

  const agentProfileQuery = useAgentProfileByUser(user?.user_id);
  const agentId = agentProfileQuery.data?.profile_id;

  const myListingsQuery = useOwnerListings(user?.user_id);
  const propertyIds = useMemo(
    () => (myListingsQuery.data ?? []).map((p) => p.property_id),
    [myListingsQuery.data],
  );
  const listingsReviews = usePropertyReviewsBatch(propertyIds);

  const myAgentReviews = useAgentReviews(agentId);

  const activeQuery = activeTab === "listings" ? listingsReviews : myAgentReviews;
  const reviews = activeQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          Received Reviews
        </h1>
      </div>

      <div
        className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-950"
        role="tablist"
        aria-label="Received review type"
      >
        {[
          { id: "listings" as const, label: "Reviews on listings" },
          { id: "me" as const, label: "Reviews On me" },
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

      {activeTab === "listings" && myListingsQuery.isLoading ? (
        <ReviewSkeleton />
      ) : activeTab === "me" && agentProfileQuery.isLoading ? (
        <ReviewSkeleton />
      ) : activeQuery.isLoading ? (
        <ReviewSkeleton />
      ) : null}

      {!activeQuery.isLoading && activeQuery.isError ? (
        <ErrorState
          title="Could not load reviews"
          message="There was a problem loading received reviews. Please try again."
        />
      ) : null}

      {!activeQuery.isLoading && !activeQuery.isError && reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Reviews from seekers will appear here when submitted."
        />
      ) : null}

      {!activeQuery.isLoading && !activeQuery.isError && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.review_id}
              review={review}
              label={
                activeTab === "listings"
                  ? `Property #${(review as PropertyReviewResponse).property_id}`
                  : `From user #${review.user_id ?? "unknown"}`
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Agency owner view ─── */

type AgencyOwnerTab = "agency" | "agents" | "listings";

function AgencyReputationView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AgencyOwnerTab>("agents");

  const agencyId = user?.agency_id;
  const agencyAgentsQuery = useAgencyAgents(agencyId ?? 0, "all", Boolean(agencyId));
  const agentProfileIds = useMemo(
    () =>
      (agencyAgentsQuery.data ?? [])
        .map((a) => a.profile_id)
        .filter((id): id is number => typeof id === "number"),
    [agencyAgentsQuery.data],
  );
  const agentsReviews = useAgentReviewsBatch(agentProfileIds);

  const agencyListingsQuery = useAgencyOwnerListings(agencyId ?? null);
  const propertyIds = useMemo(
    () => (agencyListingsQuery.data ?? []).map((p) => p.property_id),
    [agencyListingsQuery.data],
  );
  const listingsReviews = usePropertyReviewsBatch(propertyIds);

  const agencyReviews = useAgencyReviews(agencyId ?? null);

  const activeQuery =
    activeTab === "agency"
      ? agencyReviews
      : activeTab === "agents"
        ? agentsReviews
        : listingsReviews;
  const reviews = activeQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          Agency Reputation
        </h1>
      </div>

      <div
        className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-950"
        role="tablist"
        aria-label="Reputation type"
      >
        {[
          { id: "agency" as const, label: "Reviews on agency" },
          { id: "agents" as const, label: "Reviews on agents" },
          { id: "listings" as const, label: "Reviews on listings" },
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
          message="There was a problem loading reputation data. Please try again."
        />
      ) : null}

      {!activeQuery.isLoading && !activeQuery.isError && reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Reviews from seekers will appear here when submitted."
        />
      ) : null}

      {!activeQuery.isLoading && !activeQuery.isError && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.review_id}
              review={review}
              label={
                activeTab === "agency"
                  ? `Agency #${(review as AgencyReviewResponse).agency_id}`
                  : activeTab === "agents"
                    ? `Agent #${(review as AgentReviewResponse).agent_id}`
                    : `Property #${(review as PropertyReviewResponse).property_id}`
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Entry point ─── */

export default function AccountReviewsPage() {
  const { user } = useAuth();
  const role = normalizeAppRole(user?.user_role);

  if (role === "agent") {
    return <AgentReceivedReviewsView />;
  }

  if (role === "agency_owner") {
    return <AgencyReputationView />;
  }

  return <SeekerReviewsView />;
}
