"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, CardBody, LoadingState } from "@/components";
import {
  useCreateAgencyReviewRequest,
  useMembershipHistory,
} from "@/features/agencies/hooks";
import {
  formatMembershipDate,
  getLatestRevocation,
} from "@/features/agencies/components/membershipHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";

export function PostRevocationDashboard() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [submittedAgencyIds, setSubmittedAgencyIds] = useState<Set<number>>(
    () => new Set(),
  );
  const historyQuery = useMembershipHistory(Boolean(user));
  const createReviewRequest = useCreateAgencyReviewRequest();

  if (user?.user_role !== "seeker") {
    return null;
  }

  if (historyQuery.isLoading) {
    return <LoadingState message="Checking agency membership history..." />;
  }

  const latestRevocation = getLatestRevocation(historyQuery.data ?? []);

  if (!latestRevocation) {
    return null;
  }

  const hasPendingReview = submittedAgencyIds.has(latestRevocation.agency_id);
  const canRequestReview =
    !hasPendingReview &&
    !createReviewRequest.isPending;

  const handleRequestReview = async () => {
    try {
      await createReviewRequest.mutateAsync({
        agencyId: latestRevocation.agency_id,
        payload: { message: message.trim() || null },
      });
      notify.success("Your request has been submitted.");
      setSubmittedAgencyIds((current) => new Set(current).add(latestRevocation.agency_id));
      setMessage("");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      const text = typeof detail === "string" ? detail.toLowerCase() : "";

      if (
        error instanceof ApiError &&
        error.status === 409 &&
        (text.includes("pending") || text.includes("already"))
      ) {
        notify.info("Review request already submitted - waiting for agency response.");
        setSubmittedAgencyIds((current) => new Set(current).add(latestRevocation.agency_id));
        return;
      }

      notify.error("Could not submit review request.");
    }
  };

  return (
    <Card>
      <CardBody className="space-y-5 p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Agency membership update
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Your membership with{" "}
            {latestRevocation.agency_name ?? `Agency #${latestRevocation.agency_id}`}{" "}
            has been revoked.
          </h2>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            You are currently browsing as a seeker. This change was recorded on{" "}
            {formatMembershipDate(latestRevocation.created_at)}.
          </p>
        </div>

        {latestRevocation.reason ? (
          <div className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {latestRevocation.reason}
          </div>
        ) : null}

        {hasPendingReview ? (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
            Review request already submitted - waiting for agency response.
          </p>
        ) : (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Request review message
            <textarea
              rows={4}
              className="mt-1 min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Add any context you want the agency owner to review."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/agencies"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Browse Agencies
          </Link>
          <Button
            type="button"
            loading={createReviewRequest.isPending}
            disabled={!canRequestReview || hasPendingReview}
            onClick={() => void handleRequestReview()}
          >
            Request Review
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
