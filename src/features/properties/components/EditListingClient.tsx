"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  usePropertyDetail,
  useUpdateProperty,
} from "@/features/properties/hooks";
import { ListingForm, type ListingFormValues } from "@/features/properties/components/ListingForm";
import { CardBody } from "@/components";
import { AmenitySelector } from "@/features/properties/components/AmenitySelector";
import { PropertyImageManager } from "@/features/properties/components/PropertyImageManager";
import type { PropertyUpdate } from "@/types";
import { notify } from "@/lib/toast";
import { LISTING_STATUSES } from "@/features/properties/lib/propertyOptions";

interface EditListingClientProps {
  id: string;
}

type EditableListingStatus = ListingFormValues["listing_status"];

function normalizeListingStatus(status: string): EditableListingStatus {
  return LISTING_STATUSES.includes(status as EditableListingStatus)
    ? (status as EditableListingStatus)
    : "available";
}

export function EditListingClient({ id }: EditListingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreatedNotice, setShowCreatedNotice] = useState(
    searchParams.get("created") === "true",
  );
  const gate = useAgentRoleGate();
  const profileQuery = useUserProfile(gate.isAllowed);
  const propertyQuery = usePropertyDetail(id, gate.isAllowed);
  const updateProperty = useUpdateProperty();
  const initialValues = useMemo(
    () =>
      propertyQuery.data
        ? {
            title: propertyQuery.data.title,
            description: propertyQuery.data.description,
            price: Number(propertyQuery.data.price),
            bedrooms: propertyQuery.data.bedrooms ?? 0,
            bathrooms: propertyQuery.data.bathrooms ?? 0,
            property_size: Number(propertyQuery.data.property_size ?? 0),
            listing_type: propertyQuery.data.listing_type,
            listing_status: normalizeListingStatus(propertyQuery.data.listing_status),
            property_type_id: propertyQuery.data.property_type_id ?? 0,
            location_id: propertyQuery.data.location_id ?? 0,
            year_built: propertyQuery.data.year_built ?? null,
            parking_spaces: propertyQuery.data.parking_spaces ?? null,
            has_garden: Boolean(propertyQuery.data.has_garden),
            has_security: Boolean(propertyQuery.data.has_security),
            has_swimming_pool: Boolean(propertyQuery.data.has_swimming_pool),
          }
        : undefined,
    [propertyQuery.data],
  );

  useEffect(() => {
    if (
      gate.isAllowed &&
      profileQuery.data &&
      propertyQuery.data &&
      propertyQuery.data.user_id !== profileQuery.data.user_id
    ) {
      router.replace("/account/listings");
    }
  }, [gate.isAllowed, profileQuery.data, propertyQuery.data, router]);

  useEffect(() => {
    if (searchParams.get("created") !== "true") {
      return;
    }

    router.replace(`/account/listings/${id}/edit`);
  }, [id, router, searchParams]);

  if (gate.isChecking || gate.isMembershipChecking) {
    return <LoadingState fullPage message="Checking agent access..." />;
  }

  if (gate.isMembershipRestricted) {
    return (
      <ErrorState
        title="Agency access restricted"
        message={
          gate.membershipStatus?.reason
            ? `Your agency membership is ${gate.membershipStatus.status}: ${gate.membershipStatus.reason}`
            : "Your agency membership is restricted. Visit My Agencies to review the decision or request a review."
        }
      />
    );
  }

  if (!gate.isAllowed) {
    return null;
  }

  if (profileQuery.isLoading || propertyQuery.isLoading) {
    return <LoadingState fullPage message="Loading listing..." />;
  }

  if (profileQuery.isError || propertyQuery.isError || !profileQuery.data || !propertyQuery.data) {
    return (
      <ErrorState
        title="Could not load listing"
        message="There was a problem loading this property for editing."
        onRetry={() => {
          void profileQuery.refetch();
          void propertyQuery.refetch();
        }}
      />
    );
  }

  if (propertyQuery.data.user_id !== profileQuery.data.user_id) {
    return null;
  }

  const handleSubmit = async (values: ListingFormValues) => {
    const payload: PropertyUpdate = {
      title: values.title,
      description: values.description,
      price: values.price,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      property_size: values.property_size,
      listing_type: values.listing_type,
      listing_status: values.listing_status,
      property_type_id: values.property_type_id,
      location_id: values.location_id,
      year_built: values.year_built,
      parking_spaces: values.parking_spaces,
      has_garden: values.has_garden,
      has_security: values.has_security,
      has_swimming_pool: values.has_swimming_pool,
    };

    await updateProperty.mutateAsync({
      propertyId: propertyQuery.data.property_id,
      data: payload,
    });
    setShowCreatedNotice(false);
    notify.success("Listing updated");
    router.push("/account/listings");
  };

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Edit listing
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Update the details for this property.
        </p>
      </div>
      <ListingForm
        title="Edit listing"
        description="Update the details for this property."
        submitLabel="Save changes"
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitting={updateProperty.isPending}
        secondaryActionLabel="Back to listings"
        onSecondaryAction={() => router.push("/account/listings")}
        variant="plain"
      />
      {showCreatedNotice ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          Your listing was created. Add photos below to make it visible in the public feed.
        </div>
      ) : null}
      <PropertyImageManager propertyId={propertyQuery.data.property_id} variant="plain" />
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Amenities
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose the features that best describe this property.
          </p>
        </div>
        <CardBody className="px-0 pb-0 pt-0">
          <AmenitySelector propertyId={propertyQuery.data.property_id} />
        </CardBody>
      </section>
    </div>
  );
}
