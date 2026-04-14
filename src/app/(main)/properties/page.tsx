import { Suspense } from "react";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { PropertiesExplorer } from "@/features/properties/components/PropertiesExplorer";

function PropertiesExplorerFallback() {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          RealtorNet Listings
        </p>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Discover verified homes across Nigeria
          </h1>
          <p className="max-w-3xl text-base text-gray-600 dark:text-gray-300">
            Browse active listings, compare prices, and narrow your search before you
            sign in to save favorites or manage inquiries.
          </p>
        </div>
      </section>

      <Suspense fallback={<PropertiesExplorerFallback />}>
        <PropertiesExplorer />
      </Suspense>
    </div>
  );
}
