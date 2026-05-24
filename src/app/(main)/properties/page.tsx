import Link from "next/link";
import type { Metadata } from "next";
import { PropertiesPageIntro } from "@/features/properties/components/PropertiesPageIntro";
import { PropertiesExplorerShell } from "./PropertiesExplorerShell";
import { PROPERTIES_PAGE_SIZE } from "@/features/properties/lib/propertyPagination";
import { buildPropertyQuery } from "@/features/properties/hooks/useProperties";
import { MODERATION_STATUS } from "@/features/properties/lib/moderation";
import { parseListingStatus, parseListingType } from "@/features/properties/lib/propertyOptions";
import { serverPublicApi } from "@/lib/api/serverPublic";
import type { PaginatedProperties, PropertyFilters } from "@/types";

export const metadata: Metadata = {
  title: "Properties for Sale & Rent in Nigeria",
  description:
    "Browse verified property listings across Nigeria. Filter by price, bedrooms, location and property type.",
  openGraph: {
    title: "Properties for Sale & Rent in Nigeria | RealtorNet",
    description: "Browse verified property listings across Nigeria.",
    url: "/properties",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function readNumberSearchValue(searchParams: SearchParams, key: string) {
  const value = readSearchValue(searchParams, key);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildInitialPropertyFilters(searchParams: SearchParams): PropertyFilters {
  const page = readNumberSearchValue(searchParams, "page") ?? 1;

  return {
    skip: (Math.max(1, page) - 1) * PROPERTIES_PAGE_SIZE,
    limit: PROPERTIES_PAGE_SIZE,
    search: readSearchValue(searchParams, "search") ?? undefined,
    listing_type: parseListingType(readSearchValue(searchParams, "listing_type") ?? null),
    listing_status: parseListingStatus(readSearchValue(searchParams, "listing_status") ?? null),
    moderation_status: MODERATION_STATUS.verified,
    min_price: readNumberSearchValue(searchParams, "min_price"),
    max_price: readNumberSearchValue(searchParams, "max_price"),
    bedrooms: readNumberSearchValue(searchParams, "bedrooms"),
    location_id: readNumberSearchValue(searchParams, "location_id"),
    property_type_id: readNumberSearchValue(searchParams, "property_type_id"),
  };
}

interface PropertiesPageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialFilters = buildInitialPropertyFilters(resolvedSearchParams);
  const initialData = await serverPublicApi<PaginatedProperties>(
    `/api/v1/properties/${buildPropertyQuery(initialFilters)}`,
    60,
  );

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        Home
      </Link>

      <PropertiesPageIntro />
      <PropertiesExplorerShell initialData={initialData} />
    </div>
  );
}
