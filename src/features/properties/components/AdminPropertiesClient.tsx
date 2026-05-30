"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Input, LoadingState } from "@/components";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import { useAdminProperties, useVerifyProperty } from "@/features/properties/hooks";
import {
  MODERATION_STATUS,
  moderationStatusBadgeVariant,
  moderationStatusLabel,
} from "@/features/properties/lib/moderation";
import { notify } from "@/lib/toast";
import type { ModerationStatus, Property } from "@/types";

type ModerationTab = ModerationStatus | "all";

const MODERATION_TABS: Array<{ value: ModerationTab; label: string }> = [
  { value: MODERATION_STATUS.agencyApproved, label: "Admin review" },
  { value: MODERATION_STATUS.verified, label: "Live" },
  { value: MODERATION_STATUS.rejected, label: "Rejected" },
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

interface PropertyModerationCardProps {
  property: Property;
  reason: string;
  onReasonChange: (value: string) => void;
  isActing: boolean;
  onVerify: () => void;
  onReject: () => void;
  onRevoke: () => void;
  onReverify: () => void;
}

function PropertyModerationCard({
  property,
  reason,
  onReasonChange,
  isActing,
  onVerify,
  onReject,
  onRevoke,
  onReverify,
}: PropertyModerationCardProps) {
  const status = property.moderation_status;
  const isAgencyApproved = status === MODERATION_STATUS.agencyApproved;
  const isVerified = status === MODERATION_STATUS.verified;
  const isRejectedOrRevoked =
    status === MODERATION_STATUS.rejected || status === MODERATION_STATUS.revoked;

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
            {isAgencyApproved ? (
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
            {isVerified ? (
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
            {isRejectedOrRevoked ? (
              <Button
                type="button"
                size="sm"
                loading={isActing}
                onClick={onReverify}
              >
                Re-verify
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

        {isAgencyApproved || isVerified ? (
          <Input
            label={
              isAgencyApproved
                ? "Rejection reason (required to reject)"
                : "Revocation reason (required to revoke)"
            }
            placeholder={
              isAgencyApproved ? "Required before rejecting" : "Required before revoking"
            }
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}

export function AdminPropertiesClient() {
  const gate = useAdminRoleGate();
  const [activeTab, setActiveTab] = useState<ModerationTab>(MODERATION_STATUS.agencyApproved);
  const moderationStatusFilter = activeTab === "all" ? null : activeTab;
  const adminPropertiesQuery = useAdminProperties(gate.isAllowed, moderationStatusFilter);
  const verifyProperty = useVerifyProperty();
  const [reasons, setReasons] = useState<Record<number, string>>({});

  if (gate.isChecking || !gate.isAllowed) {
    return <LoadingState />;
  }

  if (adminPropertiesQuery.isLoading) {
    return <LoadingState />;
  }

  if (adminPropertiesQuery.isError) {
    return (
      <ErrorState
        title="Could not load properties"
        message="There was a problem loading the property moderation queue."
        onRetry={() => void adminPropertiesQuery.refetch()}
      />
    );
  }

  const activeProperties = adminPropertiesQuery.data ?? [];

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
      await verifyProperty.mutateAsync({
        propertyId,
        moderationStatus: MODERATION_STATUS.verified,
      });
      notify.success("Listing verified and published.");
      setActiveTab(MODERATION_STATUS.verified);
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
      await verifyProperty.mutateAsync({
        propertyId,
        moderationStatus: MODERATION_STATUS.rejected,
        moderationReason: reason,
      });
      notify.success("Listing rejected and returned to agent.");
      setActiveTab(MODERATION_STATUS.rejected);
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
      await verifyProperty.mutateAsync({
        propertyId,
        moderationStatus: MODERATION_STATUS.revoked,
        moderationReason: reason,
      });
      notify.success("Listing revoked.");
      setActiveTab(MODERATION_STATUS.revoked);
      clearReason(propertyId);
    } catch {
      notify.error("Could not revoke listing.");
    }
  };

  const handleReverify = async (propertyId: number) => {
    try {
      await verifyProperty.mutateAsync({
        propertyId,
        moderationStatus: MODERATION_STATUS.verified,
      });
      notify.success("Listing re-verified.");
      setActiveTab(MODERATION_STATUS.verified);
      clearReason(propertyId);
    } catch {
      notify.error("Could not re-verify listing.");
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
            {activeProperties.map((property) => (
              <PropertyModerationCard
                key={property.property_id}
                property={property}
                reason={reasons[property.property_id] ?? ""}
                onReasonChange={(value) => setReason(property.property_id, value)}
                isActing={
                  verifyProperty.isPending &&
                  verifyProperty.variables?.propertyId === property.property_id
                }
                onVerify={() => void handleVerify(property.property_id)}
                onReject={() => void handleReject(property.property_id)}
                onRevoke={() => void handleRevoke(property.property_id)}
                onReverify={() => void handleReverify(property.property_id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
