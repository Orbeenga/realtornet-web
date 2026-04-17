import Image from "next/image";
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
      <section className="grid gap-5 overflow-hidden rounded-[2rem] border border-sky-100 bg-linear-to-br from-white via-sky-50 to-blue-100 px-5 py-6 shadow-sm sm:px-8 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center dark:border-sky-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/80 p-2.5 shadow-sm ring-1 ring-sky-100 dark:bg-white/10 dark:ring-white/10">
              <Image
                src="/properties-hero.svg"
                alt=""
                width={48}
                height={48}
                sizes="48px"
                className="h-12 w-12"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              RealtorNet Listings
            </p>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Discover verified homes across Nigeria
            </h1>
            <p className="max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
              Browse active listings, compare prices, and narrow your search before
              you sign in to save favorites or manage inquiries.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-sky-100 dark:bg-white/10 dark:ring-white/10">
              Live production inventory
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-sky-100 dark:bg-white/10 dark:ring-white/10">
              Verified agent journeys
            </span>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-sm rounded-[1.75rem] bg-white/70 p-4 shadow-lg ring-1 ring-sky-100/80 md:block dark:bg-slate-950/60 dark:ring-white/10">
          <Image
            src="/properties-hero.svg"
            alt="Illustration of multiple verified property listings and city homes"
            width={1200}
            height={900}
            preload
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 1024px) 40vw, 28rem"
            className="h-auto w-full rounded-[1.25rem] object-cover"
          />
        </div>
      </section>

      <Suspense fallback={<PropertiesExplorerFallback />}>
        <PropertiesExplorer />
      </Suspense>
    </div>
  );
}
