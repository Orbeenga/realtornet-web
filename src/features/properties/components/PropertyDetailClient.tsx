"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { useFavorites, useFavoriteToggle } from "@/features/favorites/hooks";
import {
  useAgentProfileByUser,
  useLocationDetail,
  usePropertyDetail,
  usePropertyImages,
  usePropertyTypeDetail,
} from "@/features/properties/hooks";
import {
  Badge,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components";
import {
  PropertyAgentPanel,
  PropertyImageGallery,
  PropertySpecsPanel,
  PropertyStaticMap,
} from "@/features/properties/components";
import { ApiError } from "@/lib/api/client";
import { notify } from "@/lib/toast";

interface PropertyDetailClientProps {
  id: string;
}

const InquiryForm = dynamic(
  () =>
    import("@/features/inquiries/components/InquiryForm").then(
      (module) => module.InquiryForm,
    ),
  {
    loading: () => <InquiryFormFallback />,
  },
);

function formatPrice(price: string, currency: string | null) {
  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice)) {
    return `${currency ?? "NGN"} ${price}`;
  }

  return `${currency ?? "NGN"} ${numericPrice.toLocaleString()}`;
}

function PropertyDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-[28rem] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

function InquiryFormFallback() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </section>
  );
}

export function PropertyDetailClient({ id }: PropertyDetailClientProps) {
  const lastFavoriteToggleAtRef = useRef(0);
  const router = useRouter();
  const { user } = useAuth();
  const propertyId = Number(id);

  const propertyQuery = usePropertyDetail(id);
  const property = propertyQuery.data;

  const locationQuery = useLocationDetail(property?.location_id);
  const propertyTypeQuery = usePropertyTypeDetail(property?.property_type_id);
  const imagesQuery = usePropertyImages(property?.property_id);
  const agentQuery = useAgentProfileByUser(property?.user_id);
  const favoritesQuery = useFavorites();
  const favoriteToggle = useFavoriteToggle();

  const isFavorited =
    typeof property?.property_id === "number" &&
    (favoritesQuery.data?.some(
      (favorite) => favorite.property_id === property.property_id,
    ) ??
      false);

  const handleToggleFavorite = async () => {
    const now = Date.now();

    if (
      !property?.property_id ||
      favoriteToggle.isPending ||
      now - lastFavoriteToggleAtRef.current < 500
    ) {
      return;
    }

    lastFavoriteToggleAtRef.current = now;

    try {
      await favoriteToggle.mutateAsync({
        propertyId: property.property_id,
        isFavorited,
      });
      notify.success(isFavorited ? "Removed from saved" : "Saved to favorites");
    } catch {
      notify.error("Could not update favorites");
    }
  };

  if (propertyQuery.isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (propertyQuery.isError) {
    if (propertyQuery.error instanceof ApiError && propertyQuery.error.status === 404) {
      return (
        <EmptyState
          title="Property not found"
          description="The listing may have been removed or the link is no longer valid."
          action={{ label: "Back to listings", onClick: () => router.push("/properties") }}
        />
      );
    }

    return (
      <ErrorState
        title="Could not load property"
        message="There was a problem loading this listing. Please try again."
        onRetry={() => {
          void propertyQuery.refetch();
        }}
      />
    );
  }

  if (!property) {
    return (
      <EmptyState
        title="Property not found"
        description="The listing may have been removed or the link is no longer valid."
        action={{ label: "Back to listings", onClick: () => router.push("/properties") }}
      />
    );
  }

  const locationLabel = [
    locationQuery.data?.neighborhood,
    locationQuery.data?.city,
    locationQuery.data?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-8">
      <Link
        href="/properties"
        prefetch={false}
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
        Back to listings
      </Link>

      <PropertyImageGallery
        title={property.title}
        images={imagesQuery.data ?? []}
        isFavorited={isFavorited}
        favoritePending={favoriteToggle.isPending}
        onToggleFavorite={handleToggleFavorite}
        showFavoriteButton={Boolean(user)}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {property.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{property.listing_status}</Badge>
              <Badge variant="outline">{property.listing_type}</Badge>
              {property.is_verified ? <Badge>Verified</Badge> : null}
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 px-5 py-4 dark:bg-blue-950/40">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Price
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-200">
              {formatPrice(property.price, property.price_currency)}
            </p>
          </div>
        </div>

        {locationLabel ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{locationLabel}</p>
        ) : null}
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <PropertySpecsPanel
          property={property}
          propertyTypeName={propertyTypeQuery.data?.name}
          locationLabel={locationLabel}
        />
        <PropertyAgentPanel
          agent={agentQuery.data}
          ownerUserId={property.user_id}
        />
      </section>

      <PropertyStaticMap location={locationQuery.data} />

      {/*
        The inquiry form brings validation and auth form code that the detail
        page does not need for its first paint. Loading it on demand keeps the
        route readable while trimming the amount of JavaScript the listings flow
        has to parse up front.
      */}
      <InquiryForm propertyId={propertyId} />

      {(locationQuery.isError || propertyTypeQuery.isError || imagesQuery.isError) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Some supporting property details could not be loaded, but the main listing is still available.
        </div>
      ) : null}
    </div>
  );
}
