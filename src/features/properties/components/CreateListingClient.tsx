"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, LoadingState, Skeleton } from "@/components";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useAgentProfileByUser,
  useAmenities,
  useCreateProperty,
  useSyncPropertyAmenities,
} from "@/features/properties/hooks";
import { ListingForm, type ListingFormValues } from "@/features/properties/components/ListingForm";
import { PropertyImageManager } from "@/features/properties/components/PropertyImageManager";
import type { PropertyCreate } from "@/types";
import { notify } from "@/lib/toast";
import { AmenityCheckboxGrid } from "@/features/properties/components/AmenitySelector";
import { ApiError } from "@/lib/api/client";
import type { Property } from "@/types";

export function CreateListingClient() {
  const router = useRouter();
  const gate = useAgentRoleGate();
  const profileQuery = useUserProfile(gate.isAllowed);
  const agentProfileQuery = useAgentProfileByUser(
    gate.isAllowed ? profileQuery.data?.user_id : undefined,
  );
  const createProperty = useCreateProperty();
  const amenitiesQuery = useAmenities();
  const syncAmenities = useSyncPropertyAmenities();
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);
  const [createdProperty, setCreatedProperty] = useState<Property | null>(null);
  const hasAgentProfileError = agentProfileQuery.isError;

  if (gate.isChecking) {
    return <LoadingState fullPage message="Checking agent access..." />;
  }

  if (!gate.isAllowed) {
    return null;
  }

  if (profileQuery.isLoading || agentProfileQuery.isLoading) {
    return <LoadingState fullPage message="Preparing listing form..." />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ErrorState
        title="Could not load listing form"
        message="There was a problem confirming your agent profile."
      />
    );
  }

  const handleSubmit = async (values: ListingFormValues) => {
    const payload: PropertyCreate = {
      title: values.title,
      description: values.description,
      price: values.price,
      property_type_id: values.property_type_id,
      location_id: values.location_id,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      property_size: values.property_size,
      listing_type: values.listing_type,
      agency_id: agentProfileQuery.data?.agency_id,
      price_currency: "NGN",
      has_garden: false,
      has_security: false,
      has_swimming_pool: false,
      is_featured: false,
    };

    const property = await createProperty.mutateAsync(payload);

    if (selectedAmenityIds.length > 0) {
      try {
        await syncAmenities.mutateAsync({
          propertyId: property.property_id,
          amenityIds: selectedAmenityIds,
        });
      } catch (error) {
        if (error instanceof ApiError && typeof error.detail === "string") {
          notify.error(error.detail);
          return;
        }

        notify.error("Listing created, but amenities could not be saved");
        return;
      }
    }

    setCreatedProperty(property);
    notify.success("Listing created. Add photos below to complete the listing.");
  };

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create new listing
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Publish a new property using your live backend account.
        </p>
      </div>

      {hasAgentProfileError ? (
        <ErrorState
          title="Could not confirm your existing agent profile"
          message="The agent profile lookup failed, but you can still complete the listing form and try to submit it. If submit fails too, share the browser Network response for the create-property request."
          onRetry={() => {
            void agentProfileQuery.refetch();
          }}
        />
      ) : null}

      {createdProperty ? (
        <section className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Your listing has been created. Upload at least one image now, or continue to the edit page for more changes.
          </div>

          <PropertyImageManager propertyId={createdProperty.property_id} variant="plain" />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/account/listings/${createdProperty.property_id}/edit?created=true`,
                )
              }
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Continue editing
            </button>
            <button
              type="button"
              onClick={() => router.push("/account/listings")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Back to my listings
            </button>
          </div>
        </section>
      ) : (
        <ListingForm
          title="Create new listing"
          description="Publish a new property using your live backend account."
          submitLabel="Create listing"
          onSubmit={handleSubmit}
          submitting={createProperty.isPending || syncAmenities.isPending}
          secondaryActionLabel="Back to my listings"
          onSecondaryAction={() => router.push("/account/listings")}
          variant="plain"
        >
          <AmenitySelectionSection
            selectedAmenityIds={selectedAmenityIds}
            onToggle={(amenityId) => {
              setSelectedAmenityIds((current) =>
                current.includes(amenityId)
                  ? current.filter((id) => id !== amenityId)
                  : [...current, amenityId],
              );
            }}
            loading={amenitiesQuery.isLoading}
            error={amenitiesQuery.isError}
            disabled={createProperty.isPending || syncAmenities.isPending}
            amenities={amenitiesQuery.data ?? []}
          />
        </ListingForm>
      )}
    </div>
  );
}

interface AmenitySelectionSectionProps {
  amenities: Array<{
    amenity_id: number;
    name: string;
    description?: string | null;
  }>;
  selectedAmenityIds: number[];
  onToggle: (amenityId: number) => void;
  loading: boolean;
  error: boolean;
  disabled: boolean;
}

function AmenitySelectionSection({
  amenities,
  selectedAmenityIds,
  onToggle,
  loading,
  error,
  disabled,
}: AmenitySelectionSectionProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Amenities
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select the features available at this property.
        </p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          We could not load the amenity catalogue right now.
        </p>
      ) : null}

      {!loading && !error ? (
        <AmenityCheckboxGrid
          amenities={amenities}
          selectedAmenityIds={selectedAmenityIds}
          disabled={disabled}
          onToggle={onToggle}
        />
      ) : null}
    </section>
  );
}
