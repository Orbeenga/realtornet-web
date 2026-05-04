"use client";

import { useRef, type MouseEvent } from "react";
import Link from "next/link";
import type { Property } from "@/types";
import { Badge } from "@/components/Badge";
import { Card, CardBody } from "@/components/Card";
import {
  useFavoriteCount,
  useFavoriteToggle,
  useIsFavorited,
} from "@/features/favorites/hooks";
import { usePropertyImages } from "@/features/properties/hooks";
import {
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
} from "@/features/properties/lib/propertyOptions";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  onNavigateToDetail?: () => void;
  locationLabel?: string | null;
}

const statusVariant: Record<
  string,
  "success" | "warning" | "danger" | "default"
> = {
  available: "success",
  active: "success",
  rent: "default",
  lease: "default",
  sold: "danger",
  pending: "warning",
};

export function PropertyCard({
  property,
  onNavigateToDetail,
  locationLabel,
}: PropertyCardProps) {
  const lastFavoriteToggleAtRef = useRef(0);
  const favoriteCountQuery = useFavoriteCount(property.property_id);
  const isFavoritedQuery = useIsFavorited(property.property_id);
  const favoriteToggle = useFavoriteToggle();
  const imagesQuery = usePropertyImages(property.property_id);
  const displayImage = imagesQuery.data?.[0] ?? null;
  const isFavorited = isFavoritedQuery.data ?? false;

  const toggleFavorite = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();

    if (
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
      notify.success(isFavorited ? "Removed from saved listings" : "Listing saved");
    } catch {
      notify.error("Could not update saved listings");
    }
  };

  const price = property.price
    ? `${property.price_currency ?? "NGN"} ${Number(property.price).toLocaleString()}`
    : "Price on request";

  return (
    <Link
      href={`/properties/${property.property_id}`}
      prefetch={false}
      onNavigate={onNavigateToDetail}
      // The list page renders many cards at once. Warming every detail route on
      // first paint front-loads code the visitor has not asked for yet, which
      // showed up as extra TBT during the F.4 audits.
      className="block group"
    >
      <Card hoverable className="h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
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
            <div
              className={cn(
                "flex h-full w-full items-center justify-center",
                imagesQuery.isLoading && "animate-pulse",
              )}
            >
              <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </div>
          )}

          <button
            onClick={toggleFavorite}
            aria-label={isFavorited ? "Remove saved listing" : "Save listing"}
            disabled={favoriteToggle.isPending}
            className={cn(
              "absolute top-2 right-2 rounded-full p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70",
              isFavorited
                ? "bg-red-500 text-white"
                : "bg-white/80 text-gray-600 hover:bg-white",
            )}
          >
            <svg
              className="h-4 w-4"
              fill={isFavorited ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>

          <div className="absolute bottom-2 left-2 flex gap-2">
            <Badge variant={statusVariant[property.listing_status] ?? "default"}>
              {LISTING_STATUS_LABELS[property.listing_status] ?? property.listing_status}
            </Badge>
            <Badge variant="outline">
              {LISTING_TYPE_LABELS[property.listing_type] ?? property.listing_type}
            </Badge>
          </div>
        </div>

        <CardBody className="space-y-2">
          <p className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">
            {property.title}
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {price}
          </p>
          {property.agency_name ? (
            <p className="line-clamp-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {property.agency_name}
            </p>
          ) : null}
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            {locationLabel ||
              (property.location_id
                ? `Location #${property.location_id}`
                : "Location available on detail page")}
          </p>
          <div className="flex items-center gap-3 pt-1 text-xs text-gray-500">
            {property.bedrooms != null ? (
              <span>{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}</span>
            ) : null}
            {property.bathrooms != null ? (
              <span>
                {property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}
              </span>
            ) : null}
            {property.property_size != null ? (
              <span>{property.property_size} sqm</span>
            ) : null}
            <span>
              {favoriteCountQuery.data ?? 0} save
              {(favoriteCountQuery.data ?? 0) === 1 ? "" : "s"}
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
