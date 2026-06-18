"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Input, LoadingState } from "@/components";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import {
  useAdminApproveProperty,
  useAdminProperties,
  useAdminRejectProperty,
  useAdminRevocationHistory,
  useAdminRejectionHistory,
  useListingEvents,
  useReinstateProperty,
  useRestoreProperty,
  useRevokeProperty,
} from "@/features/properties/hooks";
import {
  MODERATION_STATUS,
  getAdminRevocationCta,
  getAdminRejectionCta,
  moderationStatusBadgeVariant,
  moderationStatusLabel,
} from "@/features/properties/lib/moderation";
import { notify } from "@/lib/toast";
import type { ListingEventResponse, ModerationStatus, Property } from "@/types";

type ModerationTab = ModerationStatus | "all";

const MODERATION_TABS: Array<{ value: ModerationTab; label: string }> = [
  { value: MODERATION_STATUS.adminReview, label: "Review Queue" },
  { value: MODERATION_STATUS.live, label: "Live" },
  { value: MODERATION_STATUS.adminRejected, label: "Rejected" },
  { value: MODERATION_STATUS.revoked, label: "Revoked" },
  { value: "all", label: "All" },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(price: string, currency: string | null) {
  const amount = Number(price);

  if (Number.isNaN(amount)) {
    return `${currency ?? "NGN"} ${price}`;
  }

  return `${currency ?? "NGN"} ${amount.toLocaleString()}`;
}

function ListingEventHistory({ propertyId }: { propertyId: number }) {
  const eventsQuery = useListingEvents(propertyId);

  if (eventsQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading history...</p>;
  }

  if (eventsQuery.isError) {
    return <p className="text-sm text-red-600">Could not load event history.</p>;
  }

  const events = eventsQuery.data ?? [];

  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No recorded events for this listing.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event: ListingEventResponse) => (
        <div
          key={event.event_id}
          className="flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-700 dark:text-gray-200">
              {event.from_status ? (
                <>
                  <span className="font-medium">
                    {moderationStatusLabel[event.from_status as ModerationStatus] ?? event.from_status}
                  </span>
                  {" → "}
                  <span className="font-medium">
                    {moderationStatusLabel[event.to_status as ModerationStatus] ?? event.to_status}
                  </span>
                </>
              ) : (
                <span className="font-medium">
                  {moderationStatusLabel[event.to_status as ModerationStatus] ?? event.to_status}
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500">{formatDateTime(event.created_at)}</span>
          </div>
          {event.reason ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">Reason: {event.reason}</p>
          ) : null}
          <p className="text-xs text-gray-500">Actor: {event.actor_display_name ?? `ID ${event.actor_id}`}</p>
        </div>
      ))}
    </div>
  );
}

interface PropertyModerationCardProps {
  property: Property;
  reason: string;
  onReasonChange: (value: string) => void;
  isActing: boolean;
  onVerify: () => void;
  onReject: () => void;
  onRevoke: () => void;
  onReinstate: () => void;
  onRestore: () => void;
  derivedCta?: { label: string; action: string | null } | null;
  onRejectPermanent?: () => void;
}

function PropertyModerationCard({
  property,
  reason,
  onReasonChange,
  isActing,
  onVerify,
  onReject,
  onRevoke,
  onReinstate,
  onRestore,
  derivedCta,
  onRejectPermanent,
}: PropertyModerationCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const status = property.moderation_status;
  const isAdminReview = status === MODERATION_STATUS.adminReview;
  const isLive = status === MODERATION_STATUS.live;
  const isAdminRejected = status === MODERATION_STATUS.adminRejected;
  const isRevoked = status === MODERATION_STATUS.revoked;
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/properties/${property.property_id}`}
                prefetch={false}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
              >
                {property.title}
              </Link>
              <Badge variant={moderationStatusBadgeVariant[status]}>
                {moderationStatusLabel[status]}
              </Badge>
            </div>
            {property.agency_name ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Agency: {property.agency_name}
              </p>
            ) : null}
            {property.moderation_reason ? (
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                Reason: {property.moderation_reason}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {derivedCta ? (
              derivedCta.action ? (
                <Button
                  type="button"
                  size="sm"
                  loading={isActing}
                  onClick={
                    derivedCta.action === 'restore' ? onRestore :
                    derivedCta.action === 'reinstate' ? onReinstate :
                    undefined
                  }
                >
                  {derivedCta.label}
                </Button>
              ) : (
                <span className="inline-flex h-7 items-center rounded-lg bg-gray-100 px-2.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {derivedCta.label}
                </span>
              )
            ) : (
              <>
                {isAdminReview ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      loading={isActing}
                      onClick={onVerify}
                    >
                      Verify
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      loading={isActing}
                      onClick={onReject}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {isLive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    loading={isActing}
                    onClick={onRevoke}
                  >
                    Revoke
                  </Button>
                ) : null}
                {isAdminRejected ? (
                  <Button
                    type="button"
                    size="sm"
                    loading={isActing}
                    onClick={onReinstate}
                  >
                    Reinstate
                  </Button>
                ) : null}
                {isRevoked ? (
                  <Button
                    type="button"
                    size="sm"
                    loading={isActing}
                    onClick={onRestore}
                  >
                    Restore
                  </Button>
                ) : null}
              </>
            )}
            {isRevoked && onRejectPermanent ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                loading={isActing}
                onClick={onRejectPermanent}
              >
                Reject permanently
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Submitted
            </p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">
              {formatDateTime(property.created_at)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Listing type
            </p>
            <p className="mt-1 capitalize text-gray-700 dark:text-gray-200">
              {property.listing_type}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Listing status
            </p>
            <p className="mt-1 capitalize text-gray-700 dark:text-gray-200">
              {property.listing_status}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Price
            </p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">
              {formatPrice(property.price, property.price_currency)}
            </p>
          </div>
        </div>

        {isAdminReview || isLive ? (
          <Input
            label={
              isAdminReview
                ? "Rejection reason (required to reject)"
                : "Revocation reason (required to revoke)"
            }
            placeholder={
              isAdminReview ? "Required before rejecting" : "Required before revoking"
            }
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        ) : null}

        <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            {showHistory ? "Hide history" : "View history"}
          </Button>
          {showHistory ? (
            <div className="mt-3">
              <ListingEventHistory propertyId={property.property_id} />
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

export function AdminPropertiesClient() {
  const gate = useAdminRoleGate();
  const [activeTab, setActiveTab] = useState<ModerationTab>(MODERATION_STATUS.adminReview);
  const moderationStatusFilter = activeTab === "all" ? null : activeTab;
  const adminPropertiesQuery = useAdminProperties(
    gate.isAllowed && activeTab !== MODERATION_STATUS.revoked && activeTab !== MODERATION_STATUS.adminRejected,
    moderationStatusFilter,
  );
  const revocationHistoryQuery = useAdminRevocationHistory(
    gate.isAllowed && activeTab === MODERATION_STATUS.revoked,
  );
  const rejectionHistoryQuery = useAdminRejectionHistory(
    gate.isAllowed && activeTab === MODERATION_STATUS.adminRejected,
  );
  const adminApproveProperty = useAdminApproveProperty();
  const adminRejectProperty = useAdminRejectProperty();
  const revokeProperty = useRevokeProperty();
  const reinstateProperty = useReinstateProperty();
  const restoreProperty = useRestoreProperty();
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const isHistoricalTab = activeTab === MODERATION_STATUS.revoked || activeTab === MODERATION_STATUS.adminRejected;
  const activeQuery = isHistoricalTab
    ? activeTab === MODERATION_STATUS.revoked
      ? revocationHistoryQuery
      : rejectionHistoryQuery
    : adminPropertiesQuery;

  if (gate.isChecking || !gate.isAllowed) {
    return <LoadingState />;
  }

  if (activeQuery.isLoading) {
    return <LoadingState />;
  }

  if (activeQuery.isError) {
    return (
      <ErrorState
        title="Could not load properties"
        message="There was a problem loading the property moderation queue."
        onRetry={() => void activeQuery.refetch()}
      />
    );
  }

  const activeProperties = activeQuery.data ?? [];

  const setReason = (propertyId: number, value: string) => {
    setReasons((prev) => ({ ...prev, [propertyId]: value }));
  };

  const clearReason = (propertyId: number) => {
    setReasons((prev) => {
      const next = { ...prev };
      delete next[propertyId];
      return next;
    });
  };

  const getRequiredReason = (propertyId: number, action: string): string | null => {
    const reason = reasons[propertyId]?.trim();

    if (!reason) {
      notify.error(`Enter a reason before ${action} this listing.`);
      return null;
    }

    return reason;
  };

  const handleVerify = async (propertyId: number) => {
    try {
      await adminApproveProperty.mutateAsync(propertyId);
      notify.success("Listing approved and published.");
      setActiveTab(MODERATION_STATUS.live);
      clearReason(propertyId);
    } catch {
      notify.error("Could not verify listing.");
    }
  };

  const handleReject = async (propertyId: number) => {
    const reason = getRequiredReason(propertyId, "rejecting");

    if (!reason) {
      return;
    }

    try {
      await adminRejectProperty.mutateAsync({
        propertyId,
        reason,
      });
      notify.success("Listing rejected and returned to agent.");
      setActiveTab(MODERATION_STATUS.adminRejected);
      clearReason(propertyId);
    } catch {
      notify.error("Could not reject listing.");
    }
  };

  const handleRevoke = async (propertyId: number) => {
    const reason = getRequiredReason(propertyId, "revoking");

    if (!reason) {
      return;
    }

    try {
      await revokeProperty.mutateAsync({
        propertyId,
        reason,
      });
      notify.success("Listing revoked.");
      setActiveTab(MODERATION_STATUS.revoked);
      clearReason(propertyId);
    } catch {
      notify.error("Could not revoke listing.");
    }
  };

  const handleReinstate = async (propertyId: number) => {
    try {
      await reinstateProperty.mutateAsync(propertyId);
      notify.success("Listing reinstated to admin review.");
      setActiveTab(MODERATION_STATUS.adminReview);
      clearReason(propertyId);
    } catch {
      notify.error("Could not reinstate listing.");
    }
  };

  const handleRestore = async (propertyId: number) => {
    try {
      await restoreProperty.mutateAsync(propertyId);
      notify.success("Listing restored.");
      setActiveTab(MODERATION_STATUS.live);
      clearReason(propertyId);
    } catch {
      notify.error("Could not restore listing.");
    }
  };

  const activeTabLabel = MODERATION_TABS.find((t) => t.value === activeTab)?.label ?? activeTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Property moderation
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Review submitted listings and verify, reject, or revoke them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {MODERATION_TABS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={activeTab === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {activeTabLabel}
        </h2>
        {activeProperties.length === 0 ? (
          <EmptyState
            title={`No ${activeTabLabel.toLowerCase()} listings`}
            description="Listings in this moderation status will appear here."
          />
        ) : (
          <div className="space-y-4">
            {activeProperties.map((property) => {
              const derivedCta =
                activeTab === MODERATION_STATUS.revoked
                  ? getAdminRevocationCta(property.moderation_status, property.has_instruction)
                  : activeTab === MODERATION_STATUS.adminRejected
                    ? getAdminRejectionCta(property.moderation_status, property.has_instruction)
                    : null;

              return (
                <PropertyModerationCard
                  key={property.property_id}
                  property={property}
                  reason={reasons[property.property_id] ?? ""}
                  onReasonChange={(value) => setReason(property.property_id, value)}
                  isActing={
                    (adminApproveProperty.isPending &&
                      adminApproveProperty.variables === property.property_id) ||
                    (adminRejectProperty.isPending &&
                      adminRejectProperty.variables?.propertyId === property.property_id) ||
                    (revokeProperty.isPending &&
                      revokeProperty.variables?.propertyId === property.property_id) ||
                    (reinstateProperty.isPending &&
                      reinstateProperty.variables === property.property_id) ||
                    (restoreProperty.isPending &&
                      restoreProperty.variables === property.property_id)
                  }
                  onVerify={() => void handleVerify(property.property_id)}
                  onReject={() => void handleReject(property.property_id)}
                  onRevoke={() => void handleRevoke(property.property_id)}
                  onReinstate={() => void handleReinstate(property.property_id)}
                  onRestore={() => void handleRestore(property.property_id)}
                  derivedCta={derivedCta}
                  onRejectPermanent={undefined}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
