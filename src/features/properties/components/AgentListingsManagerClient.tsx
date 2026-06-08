"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Skeleton,
} from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useAgencyOwnerListings,
  useAgentProfileByUser,
  useAdminProperties,
  useDeleteProperty,
  useOwnerListings,
  usePropertyImages,
  useAgencyApproveProperty,
  useAgencyRejectProperty,
  useRecallPropertyFromAdminReview,
  useResubmitProperty,
  useSubmitPropertyForReview,
  useSubmitPropertyToAdmin,
  useWithdrawPropertyFromReview,
} from "@/features/properties/hooks";
import { notify } from "@/lib/toast";
import {
  MODERATION_STATUS,
  moderationStatusBadgeVariant,
  moderationStatusLabel,
  shouldShowModerationReason,
} from "@/features/properties/lib/moderation";
import type { ModerationStatus, Property } from "@/types";

function formatPrice(price: string, currency: string | null) {
  const amount = Number(price);

  if (Number.isNaN(amount)) {
    return `${currency ?? "NGN"} ${price}`;
  }

  return `${currency ?? "NGN"} ${amount.toLocaleString()}`;
}

function ListingRowsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function AgentMembershipRestrictedState({
  status,
  reason,
}: {
  status?: string | null;
  reason?: string | null;
}) {
  return (
    <ErrorState
      title="Agency access restricted"
      message={
        reason
          ? `Your agency membership is ${status ?? "restricted"}: ${reason}`
          : "Your agency membership is restricted. Visit My Agencies to review the decision or request a review."
      }
    />
  );
}

type AgentListingTab =
  | "drafts"
  | "underReview"
  | "rejected"
  | "live"
  | "agencyInventory"
  | "marketplace";

type AgencyOwnerListingTab =
  | "drafts"
  | "agencyQueue"
  | "pendingAdmin"
  | "rejected"
  | "verifiedInventory"
  | "marketplace";

const AGENT_TABS: Array<{
  value: AgentListingTab;
  label: string;
  statuses: ModerationStatus[] | null;
}> = [
  { value: "drafts", label: "Drafts", statuses: [MODERATION_STATUS.draft] },
  {
    value: "underReview",
    label: "Under Review",
    statuses: [MODERATION_STATUS.agencyReview, MODERATION_STATUS.adminReview],
  },
  {
    value: "rejected",
    label: "Rejected",
    statuses: [MODERATION_STATUS.agencyRejected, MODERATION_STATUS.adminRejected],
  },
  { value: "live", label: "Live", statuses: [MODERATION_STATUS.live] },
  { value: "agencyInventory", label: "Agency Inventory", statuses: [MODERATION_STATUS.live] },
  { value: "marketplace", label: "Public Marketplace", statuses: [MODERATION_STATUS.live] },
];

const AGENCY_OWNER_TABS: Array<{
  value: AgencyOwnerListingTab;
  label: string;
  statuses: ModerationStatus[] | null;
}> = [
  { value: "drafts", label: "Drafts", statuses: [MODERATION_STATUS.draft] },
  { value: "agencyQueue", label: "Agency Queue", statuses: [MODERATION_STATUS.agencyReview] },
  { value: "pendingAdmin", label: "Pending Admin", statuses: [MODERATION_STATUS.adminReview] },
  {
    value: "rejected",
    label: "Rejected",
    statuses: [MODERATION_STATUS.agencyRejected, MODERATION_STATUS.adminRejected],
  },
  { value: "verifiedInventory", label: "Verified Inventory", statuses: [MODERATION_STATUS.live] },
  { value: "marketplace", label: "Public Marketplace", statuses: [MODERATION_STATUS.live] },
];

function filterListingsByStatuses(
  listings: Property[],
  statuses: ModerationStatus[] | null,
) {
  if (!statuses) {
    return listings;
  }

  return listings.filter((property) => statuses.includes(property.moderation_status));
}

export function AgentListingsManagerClient() {
  const router = useRouter();
  const deleteProperty = useDeleteProperty();
  const agencyApproveProperty = useAgencyApproveProperty();
  const agencyRejectProperty = useAgencyRejectProperty();
  const submitForReview = useSubmitPropertyForReview();
  const submitToAdmin = useSubmitPropertyToAdmin();
  const withdrawFromReview = useWithdrawPropertyFromReview();
  const resubmitProperty = useResubmitProperty();
  const recallFromAdmin = useRecallPropertyFromAdminReview();
  const gate = useAgentRoleGate();
  const { user } = useAuth();
  const isAgencyOwner = gate.isAgencyOwner;
  const [agentTab, setAgentTab] = useState<AgentListingTab>("drafts");
  const [agencyOwnerTab, setAgencyOwnerTab] = useState<AgencyOwnerListingTab>("agencyQueue");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectPropertyId, setRejectPropertyId] = useState<number | null>(null);
  const needsAgentProfile = gate.isAllowed && !gate.isAdmin && !isAgencyOwner;
  const profileQuery = useUserProfile(needsAgentProfile);
  const agentProfileQuery = useAgentProfileByUser(
    needsAgentProfile ? profileQuery.data?.user_id : undefined,
  );
  const agentListingsQuery = useOwnerListings(
    needsAgentProfile ? profileQuery.data?.user_id : undefined,
  );
  const agencyOwnerTabStatuses = isAgencyOwner
    ? (AGENCY_OWNER_TABS.find((tab) => tab.value === agencyOwnerTab)?.statuses ?? null)
    : null;
  const agencyOwnerListingsQuery = useAgencyOwnerListings(
    isAgencyOwner ? user?.agency_id : undefined,
    agencyOwnerTabStatuses,
  );
  const adminListingsQuery = useAdminProperties(
    gate.isAllowed && gate.isAdmin,
    MODERATION_STATUS.adminReview,
  );
  const listingsQuery = gate.isAdmin
    ? adminListingsQuery
    : isAgencyOwner
      ? agencyOwnerListingsQuery
      : agentListingsQuery;
  const hasAgentProfileError = needsAgentProfile && agentProfileQuery.isError;
  const hasUserProfileError = needsAgentProfile && profileQuery.isError;

  if (gate.isChecking || gate.isMembershipChecking) {
    return (
      <LoadingState
        fullPage
        message={gate.role === "admin" ? "Checking admin access..." : "Checking agent access..."}
      />
    );
  }

  if (gate.isMembershipRestricted) {
    return (
      <AgentMembershipRestrictedState
        status={gate.membershipStatus?.status}
        reason={gate.membershipStatus?.reason}
      />
    );
  }

  if (!gate.isAllowed) {
    return null;
  }

  if (
    (needsAgentProfile && (profileQuery.isLoading || agentProfileQuery.isLoading)) ||
    (isAgencyOwner && agencyOwnerListingsQuery.isLoading) ||
    (gate.isAdmin && adminListingsQuery.isLoading)
  ) {
    return (
      <LoadingState
        message={gate.isAdmin ? "Loading property moderation..." : "Loading your listings..."}
        fullPage
      />
    );
  }

  if (
    (needsAgentProfile && hasUserProfileError) ||
    (isAgencyOwner && agencyOwnerListingsQuery.isError) ||
    (gate.isAdmin && adminListingsQuery.isError)
  ) {
    return (
      <ErrorState
        title="Could not load your listing dashboard"
        message={
          gate.isAdmin
            ? "There was a problem loading the admin property moderation feed."
            : "There was a problem confirming your agent profile."
        }
        onRetry={() => {
          if (gate.isAdmin) {
            void adminListingsQuery.refetch();
            return;
          }

          void profileQuery.refetch();
          void agentProfileQuery.refetch();
        }}
      />
    );
  }

  const handleDelete = async (propertyId: number) => {
    if (!window.confirm("Delete this listing? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteProperty.mutateAsync(propertyId);
      notify.success("Listing deleted");
    } catch {
      notify.error("Could not delete listing");
    }
  };

  const runLifecycleAction = async (
    action: () => Promise<Property>,
    successMessage: string,
    errorMessage: string,
  ) => {
    try {
      await action();
      notify.success(successMessage);
    } catch (error) {
      const detail =
        typeof error === "object" &&
        error !== null &&
        "detail" in error &&
        typeof error.detail === "string"
          ? error.detail
          : null;

      notify.error(detail ?? errorMessage);
    }
  };

  const handleSubmitForReview = (propertyId: number) => {
    void runLifecycleAction(
      () => submitForReview.mutateAsync(propertyId),
      "Listing submitted for agency review",
      "Could not submit listing for review",
    );
  };

  const handleSubmitToAdmin = (propertyId: number) => {
    void runLifecycleAction(
      () => submitToAdmin.mutateAsync(propertyId),
      "Listing submitted to admin",
      "Could not submit listing to admin",
    );
  };

  const handleWithdraw = (propertyId: number) => {
    void runLifecycleAction(
      () => withdrawFromReview.mutateAsync(propertyId),
      "Listing withdrawn to draft",
      "Could not withdraw listing",
    );
  };

  const handleResubmit = (propertyId: number) => {
    void runLifecycleAction(
      () => resubmitProperty.mutateAsync(propertyId),
      "Listing resubmitted",
      "Could not resubmit listing",
    );
  };

  const handleRecall = (propertyId: number) => {
    void runLifecycleAction(
      () => recallFromAdmin.mutateAsync(propertyId),
      "Listing recalled to agency review",
      "Could not recall listing",
    );
  };

  const handleAgencyApprove = async (propertyId: number) => {
    try {
      await agencyApproveProperty.mutateAsync(propertyId);
      notify.success("Listing approved and sent to admin");
    } catch {
      notify.error("Could not approve listing");
    }
  };

  const handleAgencyReject = (propertyId: number) => {
    setRejectPropertyId(propertyId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmAgencyReject = async () => {
    if (!rejectReason.trim()) {
      notify.error("A reason is required to reject a listing.");
      return;
    }

    if (rejectPropertyId === null) {
      return;
    }

    try {
      await agencyRejectProperty.mutateAsync({
        propertyId: rejectPropertyId,
        reason: rejectReason.trim(),
      });
      notify.success("Listing rejected");
      setRejectDialogOpen(false);
      setRejectPropertyId(null);
      setRejectReason("");
    } catch {
      notify.error("Could not reject listing");
    }
  };

  const allListings = listingsQuery.data ?? [];
  const activeAgentTab = AGENT_TABS.find((tab) => tab.value === agentTab) ?? AGENT_TABS[0];
  const activeAgencyOwnerTab =
    AGENCY_OWNER_TABS.find((tab) => tab.value === agencyOwnerTab) ?? AGENCY_OWNER_TABS[0];
  const visibleListings = gate.isAdmin
    ? allListings
    : isAgencyOwner
      ? filterListingsByStatuses(allListings, activeAgencyOwnerTab.statuses)
      : filterListingsByStatuses(allListings, activeAgentTab.statuses);
  const countFor = (statuses: ModerationStatus[] | null) =>
    filterListingsByStatuses(allListings, statuses).length;

  return (
    <div className="mx-auto max-w-[800px] space-y-8">
      <div className="space-y-3">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to properties
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {gate.isAdmin ? "Property moderation" : "My listings"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {gate.isAdmin
                ? "Review every property, including pending listings, from one moderation queue."
                : isAgencyOwner
                  ? "Review agent listings before they reach admin. Approve to send to admin, or reject with a reason."
                  : "Manage the properties you have published on RealtorNet."}
            </p>
          </div>
          {!gate.isAdmin ? (
            <Button onClick={() => router.push("/account/listings/new")}>
              New Listing
            </Button>
          ) : null}
        </div>
      </div>

      {listingsQuery.isLoading ? <ListingRowsSkeleton /> : null}

      {hasAgentProfileError ? (
        <ErrorState
          title="Could not load your existing listings"
          message="Your agent profile lookup failed, so the dashboard could not fetch your current listings. You can still create a new listing."
          onRetry={() => {
            void agentProfileQuery.refetch();
          }}
        />
      ) : null}

      {!listingsQuery.isLoading && listingsQuery.isError ? (
        <ErrorState
          title="Could not load listings"
          message="There was a problem loading your listings. Please try again."
          onRetry={() => {
            void listingsQuery.refetch();
          }}
        />
      ) : null}

      {isAgencyOwner && !gate.isAdmin ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
          {AGENCY_OWNER_TABS.map(({ value, label, statuses }) => (
            <Button
              key={value}
              type="button"
              variant={agencyOwnerTab === value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setAgencyOwnerTab(value)}
            >
              {label} ({countFor(statuses)})
            </Button>
          ))}
        </div>
      ) : null}

      {!isAgencyOwner && !gate.isAdmin ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
          {AGENT_TABS.map(({ value, label, statuses }) => (
            <Button
              key={value}
              type="button"
              variant={agentTab === value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setAgentTab(value)}
            >
              {label} ({countFor(statuses)})
            </Button>
          ))}
        </div>
      ) : null}

      {!hasAgentProfileError &&
      !listingsQuery.isLoading &&
      !listingsQuery.isError &&
      visibleListings.length === 0 ? (
        <EmptyState
          title={
            gate.isAdmin
              ? "There are no properties available for moderation right now."
              : isAgencyOwner
                ? "No listings in this queue."
                : "You have no listings yet. Create your first one."
          }
          action={
            !gate.isAdmin
              ? {
                  label: "New Listing",
                  onClick: () => router.push("/account/listings/new"),
                }
              : undefined
          }
        />
      ) : null}

      {!hasAgentProfileError &&
      !listingsQuery.isLoading &&
      !listingsQuery.isError &&
      visibleListings.length > 0 ? (
        <div className="space-y-4">
          {visibleListings.map((property) => {
            const status = property.moderation_status;
            const isDraft = status === MODERATION_STATUS.draft;
            const isAgencyReview = status === MODERATION_STATUS.agencyReview;
            const isAdminReview = status === MODERATION_STATUS.adminReview;
            const isAgencyRejected = status === MODERATION_STATUS.agencyRejected;
            const isAdminRejected = status === MODERATION_STATUS.adminRejected;
            const isLive = status === MODERATION_STATUS.live;
            return (
              <ListingRow
                key={property.property_id}
                property={property}
                deleting={deleteProperty.isPending}
                lifecycleActing={
                  (submitForReview.isPending &&
                    submitForReview.variables === property.property_id) ||
                  (submitToAdmin.isPending &&
                    submitToAdmin.variables === property.property_id) ||
                  (withdrawFromReview.isPending &&
                    withdrawFromReview.variables === property.property_id) ||
                  (resubmitProperty.isPending &&
                    resubmitProperty.variables === property.property_id) ||
                  (recallFromAdmin.isPending &&
                    recallFromAdmin.variables === property.property_id)
                }
                agencyActing={
                  (agencyApproveProperty.isPending || agencyRejectProperty.isPending) &&
                  (
                    agencyApproveProperty.variables === property.property_id ||
                    agencyRejectProperty.variables?.propertyId === property.property_id
                  )
                }
                canEdit={!gate.isAdmin && (isDraft || isAgencyRejected || isAdminRejected)}
                canDelete={!gate.isAdmin && (isDraft || isAgencyRejected)}
                showPendingNote={!gate.isAdmin && !isAgencyOwner && isAgencyReview}
                statusHint={
                  isAdminReview
                    ? "Awaiting admin review"
                    : isAgencyReview
                      ? "Awaiting agency review"
                      : null
                }
                onEdit={() => router.push(`/account/listings/${property.property_id}/edit`)}
                onDelete={() => void handleDelete(property.property_id)}
                onSubmitForReview={
                  !isAgencyOwner && isDraft
                    ? () => handleSubmitForReview(property.property_id)
                    : undefined
                }
                onSubmitToAdmin={
                  isAgencyOwner && isDraft
                    ? () => handleSubmitToAdmin(property.property_id)
                    : undefined
                }
                onWithdraw={
                  !isAgencyOwner && isAgencyReview
                    ? () => handleWithdraw(property.property_id)
                    : undefined
                }
                onResubmit={
                  !isAgencyOwner && (isAgencyRejected || isAdminRejected)
                    ? () => handleResubmit(property.property_id)
                    : undefined
                }
                onRecall={
                  isAgencyOwner && isAdminReview
                    ? () => handleRecall(property.property_id)
                    : undefined
                }
                onAgencyApprove={
                  isAgencyOwner && isAgencyReview
                    ? () => void handleAgencyApprove(property.property_id)
                    : undefined
                }
                onAgencyReject={
                  isAgencyOwner && isAgencyReview
                    ? () => handleAgencyReject(property.property_id)
                    : undefined
                }
                publicHref={isLive ? `/properties/${property.property_id}` : undefined}
              />
            );
          })}
        </div>
      ) : null}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent finalFocus={false}>
          <DialogHeader>
            <DialogTitle>Reject listing</DialogTitle>
            <DialogDescription>
              Enter a reason for rejecting this listing. This will be visible to the agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label htmlFor="reject-reason" className="text-sm font-medium">
              Reason
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Required before rejecting"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmAgencyReject()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ListingRowProps {
  property: Property;
  deleting: boolean;
  lifecycleActing: boolean;
  agencyActing?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  showPendingNote?: boolean;
  statusHint?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onSubmitForReview?: () => void;
  onSubmitToAdmin?: () => void;
  onWithdraw?: () => void;
  onResubmit?: () => void;
  onRecall?: () => void;
  onAgencyApprove?: () => void;
  onAgencyReject?: () => void;
  publicHref?: string;
}

function ListingRow({
  property,
  deleting,
  lifecycleActing,
  agencyActing,
  canEdit,
  canDelete,
  showPendingNote,
  statusHint,
  onEdit,
  onDelete,
  onSubmitForReview,
  onSubmitToAdmin,
  onWithdraw,
  onResubmit,
  onRecall,
  onAgencyApprove,
  onAgencyReject,
  publicHref,
}: ListingRowProps) {
  const imagesQuery = usePropertyImages(property.property_id);
  const displayImage = imagesQuery.data?.[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:w-32 sm:flex-none">
        {displayImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImage.image_url}
              alt={displayImage.caption ?? property.title}
              className="h-full w-full object-cover"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <span className={imagesQuery.isLoading ? "animate-pulse" : undefined}>
              Listing
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="space-y-2">
          <Link
            href={`/properties/${property.property_id}`}
            className="block text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
          >
            {property.title}
          </Link>
          <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
            <p>{formatPrice(property.price, property.price_currency)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {property.listing_status}
              </span>
              <Badge variant={moderationStatusBadgeVariant[property.moderation_status]}>
                {moderationStatusLabel[property.moderation_status]}
              </Badge>
              <span>{property.listing_type}</span>
            </div>
            {showPendingNote ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Awaiting agency review — your listing will be sent to admin after agency approval.
              </p>
            ) : null}
            {statusHint && !showPendingNote ? (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {statusHint}
              </p>
            ) : null}
            {shouldShowModerationReason(property.moderation_status) &&
            property.moderation_reason ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                {moderationStatusLabel[property.moderation_status]} reason:{" "}
                {property.moderation_reason}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {onAgencyReject ? (
          <Button
            variant="destructive"
            size="sm"
            loading={agencyActing}
            onClick={onAgencyReject}
          >
            Reject
          </Button>
        ) : null}
        {onAgencyApprove ? (
          <Button
            size="sm"
            loading={agencyActing}
            onClick={onAgencyApprove}
          >
            Approve
          </Button>
        ) : null}
        {onSubmitForReview ? (
          <Button size="sm" loading={lifecycleActing} onClick={onSubmitForReview}>
            Submit for Review
          </Button>
        ) : null}
        {onSubmitToAdmin ? (
          <Button size="sm" loading={lifecycleActing} onClick={onSubmitToAdmin}>
            Submit to Admin
          </Button>
        ) : null}
        {onWithdraw ? (
          <Button
            variant="secondary"
            size="sm"
            loading={lifecycleActing}
            onClick={onWithdraw}
          >
            Withdraw
          </Button>
        ) : null}
        {onResubmit ? (
          <Button size="sm" loading={lifecycleActing} onClick={onResubmit}>
            Resubmit
          </Button>
        ) : null}
        {onRecall ? (
          <Button variant="secondary" size="sm" loading={lifecycleActing} onClick={onRecall}>
            Recall
          </Button>
        ) : null}
        {publicHref ? (
          <Link
            href={publicHref}
            className="inline-flex h-7 items-center justify-center rounded-lg bg-secondary px-2.5 text-[0.8rem] font-medium text-secondary-foreground transition-all hover:bg-secondary/80"
          >
            View Listing
          </Link>
        ) : null}
        {canEdit ? (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {canDelete ? (
          <Button variant="destructive" size="sm" loading={deleting} onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
