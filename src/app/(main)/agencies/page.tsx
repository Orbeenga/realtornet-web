import Link from "next/link";
import type { Metadata } from "next";
import {
  AgencyDirectoryActions,
  AgencyDirectoryClient,
} from "@/features/agencies/components";
import { serverPublicApi } from "@/lib/api/serverPublic";
import type { Agency } from "@/types";

export const metadata: Metadata = {
  title: "Property Agencies in Nigeria",
  description:
    "Discover verified real estate agencies operating across Nigeria. Browse their listings and meet their agents.",
  alternates: {
    canonical: "https://realtornet-web.vercel.app/agencies/",
  },
  openGraph: {
    title: "Property Agencies in Nigeria | RealtorNet",
    description:
      "Discover verified real estate agencies operating across Nigeria. Browse their listings and meet their agents.",
    url: "/agencies",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

export const dynamic = 'force-dynamic';

export default async function AgenciesPage() {
  const initialData = await serverPublicApi<Agency[]>(
    "/api/v1/agencies/",
    60,
  );

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://realtornet-web.vercel.app/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Agencies",
                item: "https://realtornet-web.vercel.app/agencies/",
              },
            ],
          }),
        }}
      />
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg px-2 py-1"
      >
        Home
      </Link>

      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Verified agencies
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Browse trusted real estate agencies
          </h1>
          <p className="text-base leading-7 text-gray-600 dark:text-gray-300">
            Start with an approved agency, review its active listings, then connect
            with the agent managing the home you want.
          </p>
        </div>
        <AgencyDirectoryActions />
      </div>

      <AgencyDirectoryClient initialData={initialData} />
    </div>
  );
}
