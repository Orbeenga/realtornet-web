import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { DeferredToaster } from "@/components/DeferredToaster";
import { AgencyDirectoryClient } from "@/features/agencies/components";
import { HomeHeroSearch } from "@/features/home/components/HomeHeroSearch";
import { PublicGuidePopover } from "@/features/home/components/PublicGuidePopover";
import { FeaturedPropertiesSection } from "@/features/properties/components";
import { serverPublicApi } from "@/lib/api/serverPublic";
import type { Agency, PropertyList } from "@/types";

export const metadata: Metadata = {
  title: {
    absolute: "RealtorNet — Find Verified Properties in Nigeria",
  },
  description:
    "Nigeria's trusted property marketplace. Browse agencies, explore listings, and connect with verified agents.",
  alternates: {
    canonical: "https://realtornet-web.vercel.app/",
  },
  openGraph: {
    title: "RealtorNet — Find Verified Properties in Nigeria",
    description:
      "Nigeria's trusted property marketplace. Browse agencies, explore listings, and connect with verified agents.",
    url: "/",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [featuredProperties, featuredAgencies] = await Promise.allSettled([
    serverPublicApi<PropertyList>(
      "/api/v1/properties/?page=1&page_size=6&limit=6&moderation_status=live",
      120,
    ),
    serverPublicApi<Agency[]>("/api/v1/agencies/", 120),
  ]);

  const properties =
    featuredProperties.status === "fulfilled" ? featuredProperties.value : null;
  const agencies =
    featuredAgencies.status === "fulfilled" ? featuredAgencies.value : null;
  const approvedAgencies = (agencies ?? []).filter((agency) => agency.is_verified);
  const showFeaturedListings = (properties?.length ?? 0) > 0;
  const showFeaturedAgencies = approvedAgencies.length > 0;

  const ldOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RealtorNet",
    url: "https://realtornet-web.vercel.app/",
    logo: "https://realtornet-web.vercel.app/favicon.ico",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldOrg) }}
        />
        <section className="relative bg-gradient-to-br from-slate-800 to-slate-950">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative mx-auto flex min-h-[360px] max-w-7xl flex-col justify-between gap-6 px-4 py-6 sm:px-6 md:min-h-[420px] md:py-8 lg:min-h-[480px] lg:px-8">
            <div className="flex flex-col items-start gap-4 text-left text-white">
              <div className="flex items-center gap-1 sm:gap-2">
                {(["sale","rent","lease"] as const).map((type) => (
                  <Link
                    key={type}
                    href={`/properties?listing_type=${type}`}
                    prefetch={false}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
                  >
                    {type === "sale" ? "Buy" : type === "rent" ? "Rent" : "Lease"}
                  </Link>
                ))}
                <div className="ml-2">
                  <PublicGuidePopover />
                </div>
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Find property through trusted real estate agencies
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                Browse approved agencies, inspect their listings, and move from discovery
                to inquiry with visible ownership at every step.
              </p>
            </div>

            <div className="w-full">
              <HomeHeroSearch />
            </div>
          </div>
        </section>

        {showFeaturedListings ? (
          <FeaturedPropertiesSection
            title="Featured Properties"
            initialData={properties}
          />
        ) : null}

        {showFeaturedAgencies ? (
          <section className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Featured Agencies
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Approved agencies are the public starting point for every listing journey.
                </p>
              </div>
              <Link
                href="/agencies"
                className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                See all agencies
              </Link>
            </div>
            <AgencyDirectoryClient compact initialData={agencies} />
          </section>
        ) : null}

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Represent an agency?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Submit your agency profile and ownership details for admin review.
              </p>
              <Link
                href="/agencies/apply"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Apply as Agency
              </Link>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Looking to join an agency?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Browse approved agencies, open a profile, and request to join from
                the agency page.
              </p>
              <Link
                href="/agencies"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Join an agency
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DeferredToaster />
    </div>
  );
}
