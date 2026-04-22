"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Skeleton,
} from "@/components";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAgentListings } from "@/features/agents/hooks";
import {
  useAgentProfileByUser,
  useAdminProperties,
  useDeleteProperty,
  usePropertyImages,
  useVerifyProperty,
} from "@/features/properties/hooks";
import { notify } from "@/lib/toast";
import type { Property } from "@/types";

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

export function AgentListingsManagerClient() {
  const router = useRouter();
  const deleteProperty = useDeleteProperty();
  const verifyProperty = useVerifyProperty();
  const gate = useAgentRoleGate();
  const profileQuery = useUserProfile(gate.isAllowed && !gate.isAdmin);
  const agentProfileQuery = useAgentProfileByUser(
    gate.isAllowed && !gate.isAdmin ? profileQuery.data?.user_id : undefined,
  );
  const agentListingsQuery = useAgentListings(
    gate.isAllowed && agentProfileQuery.data ? agentProfileQuery.data.profile_id : "",
  );
  const adminListingsQuery = useAdminProperties(gate.isAllowed && gate.isAdmin);
  const listingsQuery = gate.isAdmin ? adminListingsQuery : agentListingsQuery;
  const hasAgentProfileError = !gate.isAdmin && agentProfileQuery.isError;
  const hasUserProfileError = !gate.isAdmin && profileQuery.isError;

  if (gate.isChecking) {
    return (
      <LoadingState
        fullPage
        message={gate.role === "admin" ? "Checking admin access..." : "Checking agent access..."}
      />
    );
  }

  if (!gate.isAllowed) {
    return null;
  }

  if (
    (!gate.isAdmin && (profileQuery.isLoading || agentProfileQuery.isLoading)) ||
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
    (!gate.isAdmin && hasUserProfileError) ||
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

  const handleToggleVerification = async (
    propertyId: number,
    isVerified: boolean,
  ) => {
    try {
      await verifyProperty.mutateAsync({
        propertyId,
        isVerified,
      });
      notify.success(
        isVerified ? "Listing marked as verified" : "Listing marked as pending",
      );
    } catch (error) {
      const detail =
        typeof error === "object" &&
        error !== null &&
        "detail" in error &&
        typeof error.detail === "string"
          ? error.detail
          : null;

      notify.error(detail ?? "Could not update verification status");
    }
  };

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

      {!hasAgentProfileError &&
      !listingsQuery.isLoading &&
      !listingsQuery.isError &&
      (listingsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title={
            gate.isAdmin
              ? "There are no properties available for moderation right now."
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
      (listingsQuery.data ?? []).length > 0 ? (
        <div className="space-y-4">
          {(listingsQuery.data ?? []).map((property) => (
            <ListingRow
              key={property.property_id}
              property={property}
              deleting={deleteProperty.isPending}
              verifying={
                verifyProperty.isPending &&
                verifyProperty.variables?.propertyId === property.property_id
              }
              canManage={!gate.isAdmin}
              onEdit={() => router.push(`/account/listings/${property.property_id}/edit`)}
              onDelete={() => void handleDelete(property.property_id)}
              onToggleVerification={
                gate.isAdmin
                  ? () =>
                      void handleToggleVerification(
                        property.property_id,
                        !property.is_verified,
                      )
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ListingRowProps {
  property: Property;
  deleting: boolean;
  verifying: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVerification?: () => void;
}

function ListingRow({
  property,
  deleting,
  verifying,
  canManage,
  onEdit,
  onDelete,
  onToggleVerification,
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
              <Badge variant={property.is_verified ? "success" : "warning"}>
                {property.is_verified ? "Verified" : "Pending"}
              </Badge>
              <span>{property.listing_type}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {onToggleVerification ? (
          <Button
            variant="secondary"
            size="sm"
            loading={verifying}
            onClick={onToggleVerification}
          >
            {property.is_verified ? "Reject" : "Verify"}
          </Button>
        ) : null}
        {canManage ? (
          <>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" loading={deleting} onClick={onDelete}>
              Delete
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
