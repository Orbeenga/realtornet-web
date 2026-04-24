"use client";

import Link from "next/link";
import { EmptyState, ErrorState, PropertyCardSkeleton } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { useFavoriteProperties } from "@/features/favorites/hooks";
import { getFavoritesPageCopy } from "@/features/auth/navigation";
import { PropertyCard } from "@/features/properties/components";

export default function FavoritesPage() {
  const { user } = useAuth();
  const favoritesQuery = useFavoriteProperties();
  const { savedTitle, savedDescription, emptyTitle, emptyDescription } =
    getFavoritesPageCopy(user?.user_role);

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
          Back to listings
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {savedTitle}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {savedDescription}
          </p>
        </div>
      </div>

      {favoritesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {!favoritesQuery.isLoading && favoritesQuery.isError ? (
        <ErrorState
          title="Could not load saved properties"
          message="There was a problem loading your favorites. Please try again."
          onRetry={() => {
            void favoritesQuery.refetch();
          }}
        />
      ) : null}

      {!favoritesQuery.isLoading &&
      !favoritesQuery.isError &&
      favoritesQuery.properties.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : null}

      {!favoritesQuery.isLoading &&
      !favoritesQuery.isError &&
      favoritesQuery.properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favoritesQuery.properties.map((property) => (
            <PropertyCard key={property.property_id} property={property} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
