"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, Modal } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { normalizeAppRole } from "@/features/auth/navigation";
import {
  useCreateAgencyReviewRequest,
  useLeaveAgencyMembership,
  useMembershipHistory,
  useMyAgencyJoinRequests,
  useMyAgencyMemberships,
} from "@/features/agencies/hooks";
import { isVerifiedAgency } from "@/features/agencies/lib/verification";
import { getStoredJwtRole } from "@/lib/jwt";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import type { Agency } from "@/types";
import {
  getLatestAuditRecord,
  isReturningMembershipAction,
} from "./membershipHistory";

interface AgencyProfileHeaderProps {
  agency: Agency;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AgencyProfileHeader({ agency }: AgencyProfileHeaderProps) {
  const initials = getInitials(agency.name);
  const { user, loading } = useAuth();
  const [reviewMessage, setReviewMessage] = useState("");
  const [submittedReviewRequest, setSubmittedReviewRequest] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveReasonError, setLeaveReasonError] = useState("");
  const role = normalizeAppRole(getStoredJwtRole() ?? user?.user_role);
  const isAgencyApplicantRole = role === "seeker" || role === "agent";
  const requestsQuery = useMyAgencyJoinRequests(
    !loading && Boolean(user) && isAgencyApplicantRole,
  );
  const membershipsQuery = useMyAgencyMemberships(!loading && Boolean(user));
  const historyQuery = useMembershipHistory(!loading && Boolean(user));
  const createReviewRequest = useCreateAgencyReviewRequest();
  const existingRequest = requestsQuery.data
    ?.filter((request) => request.agency_id === agency.agency_id)
    .find((request) => request.status === "approved" || request.status === "pending");
  const matchingMembership = membershipsQuery.data?.find(
    (membership) => membership.agency_id === agency.agency_id,
  );
  const latestHistory = getLatestAuditRecord(
    historyQuery.data ?? [],
    agency.agency_id,
  );
  const isActiveMember = matchingMembership?.status === "active";
  const isBlockedMember = matchingMembership?.status === "blocked";
  const hasPendingReview =
    Boolean(matchingMembership?.pending_review_request_id) || submittedReviewRequest;
  const isReturningApplicant = isReturningMembershipAction(latestHistory?.action);
  const shouldResolveAuthenticatedCta =
    Boolean(user) &&
    (requestsQuery.isLoading || membershipsQuery.isLoading || historyQuery.isLoading);

  const leaveMutation = useLeaveAgencyMembership();
  const queryClient = useQueryClient();

  const handleLeave = async () => {
    if (!matchingMembership) return;
    const trimmedReason = leaveReason.trim();
    if (!trimmedReason) {
      setLeaveReasonError("Please provide a reason for leaving.");
      return;
    }
    setLeaveReasonError("");
    try {
      const result = await leaveMutation.mutateAsync({
        membershipId: matchingMembership.membership_id,
        reason: trimmedReason,
      });
      setShowLeaveDialog(false);
      setLeaveReason("");
      if (result.role_changed && result.new_role === "seeker") {
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        window.location.assign("/");
      } else {
        await queryClient.invalidateQueries({ queryKey: ["myAgencyMemberships"] });
        await queryClient.invalidateQueries({ queryKey: ["membershipHistory"] });
      }
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      const text = typeof detail === "string" ? detail.toLowerCase() : "";
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        (text.includes("active") || text.includes("listings"))
      ) {
        notify.error("Cannot leave agency while you have active listings.");
      } else {
        notify.error("Could not leave this agency.");
      }
    }
  };

  const handleRequestReview = async () => {
    try {
      await createReviewRequest.mutateAsync({
        agencyId: agency.agency_id,
        payload: { message: reviewMessage.trim() || null },
      });
      notify.success("Your request has been submitted.");
      setSubmittedReviewRequest(true);
      setReviewMessage("");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      const text = typeof detail === "string" ? detail.toLowerCase() : "";

      if (
        error instanceof ApiError &&
        error.status === 409 &&
        (text.includes("pending") || text.includes("already"))
      ) {
        notify.info("Review request already submitted - waiting for agency response.");
        setSubmittedReviewRequest(true);
        return;
      }

      notify.error("Could not submit review request.");
    }
  };

  const cta = (() => {
    if (loading || shouldResolveAuthenticatedCta) {
      return null;
    }

    if (!user) {
      return (
        <Link
          href={`/agencies/${agency.agency_id}/join`}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Apply to Join
        </Link>
      );
    }

    if (!isAgencyApplicantRole) {
      return null;
    }

    if (isBlockedMember) {
      return (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
          You cannot apply to this agency.
        </div>
      );
    }

    if (isActiveMember || existingRequest?.status === "approved") {
      return (
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900">
            Active Member
          </span>
          <button
            type="button"
            onClick={() => setShowLeaveDialog(true)}
            className="text-sm text-red-600 underline underline-offset-2 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Leave this agency
          </button>
        </div>
      );
    }

    if (hasPendingReview || existingRequest?.status === "pending") {
      return (
        <Link
          href="/account/join-requests"
          className="inline-flex items-center justify-center rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
        >
          Rejoin Request Pending
        </Link>
      );
    }

    if (isReturningApplicant) {
      return (
        <div className="w-full max-w-sm space-y-2">
          <textarea
            rows={3}
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Optional note for the agency owner"
            value={reviewMessage}
            onChange={(event) => setReviewMessage(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            loading={createReviewRequest.isPending}
            onClick={() => void handleRequestReview()}
          >
            Request to Rejoin
          </Button>
        </div>
      );
    }

    return (
      <Link
        href={`/agencies/${agency.agency_id}/join`}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Apply to Join
      </Link>
    );
  })();

  return (
    <>
      <Card>
        <CardBody className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-2xl font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            {agency.logo_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agency.logo_url}
                  alt={agency.name}
                  className="h-full w-full object-cover"
                />
              </>
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {agency.name}
                </h1>
                {isVerifiedAgency(agency) ? <Badge>Verified</Badge> : null}
              </div>
              {cta}
            </div>

            {agency.description ? (
              <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                {agency.description}
              </p>
            ) : null}

            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
              {agency.email ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {agency.email}
                  </p>
                </div>
              ) : null}
              {agency.phone_number ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {agency.phone_number}
                  </p>
                </div>
              ) : null}
              {agency.address ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Address
                  </p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {agency.address}
                  </p>
                </div>
              ) : null}
              {agency.website_url ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Website
                  </p>
                  <a
                    href={agency.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Visit website
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={showLeaveDialog}
        onClose={() => {
          setShowLeaveDialog(false);
          setLeaveReason("");
          setLeaveReasonError("");
        }}
        title="Leave this agency"
        description="Are you sure you want to leave this agency? If you have active listings through this agency, you'll need to transfer or remove them first."
        footer={
          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowLeaveDialog(false);
                setLeaveReason("");
                setLeaveReasonError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              loading={leaveMutation.isPending}
              disabled={!leaveReason.trim()}
              onClick={() => void handleLeave()}
            >
              Leave
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <textarea
            rows={3}
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Reason for leaving (required — shared with the agency)"
            value={leaveReason}
            onChange={(event) => {
              setLeaveReason(event.target.value);
              if (leaveReasonError) setLeaveReasonError("");
            }}
          />
          {leaveReasonError ? (
            <p className="text-xs text-red-500">{leaveReasonError}</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
