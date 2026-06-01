"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { useLocations, useProperties, usePropertyTypes } from "@/features/properties/hooks";
import {
  restorePropertiesScrollPosition,
  savePropertiesScrollPosition,
} from "@/features/properties/lib/scrollRestoration";
import {
  parseListingStatus,
  parseListingType,
} from "@/features/properties/lib/propertyOptions";
import {
  MODERATION_STATUS,
  isVerifiedModerationStatus,
} from "@/features/properties/lib/moderation";
import { buildLocationLabelMap } from "@/features/properties/lib/locationLabels";
import { PROPERTIES_PAGE_SIZE } from "@/features/properties/lib/propertyPagination";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { useIdleHydration } from "@/lib/useIdleHydration";
import type { PaginatedProperties, Property } from "@/types";

const PAGE_SIZE = PROPERTIES_PAGE_SIZE;

const PropertyFilters = dynamic(
  () =>
    import("@/features/properties/components/PropertyFilters").then(
      (module) => module.PropertyFilters,
    ),
  {
    loading: () => <PropertyFiltersFallback />,
  },
);
const PropertyMap = dynamic(
  () =>
    import("@/features/properties/components/PropertyMap").then(
      (module) => module.PropertyMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-220px)] min-h-[28rem] rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
    ),
  },
);

function PropertyFiltersFallback() {
  return (
    <div className="mb-8">
      <div className="mx-auto flex w-full max-w-2xl gap-2">
        <div className="h-11 min-w-0 flex-1 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-32 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}


export function PropertiesExplorer({
  initialData,
}: {
  initialData?: PaginatedProperties | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentView = searchParams.get("view") === "map" ? "map" : "grid";
  const sort = searchParams.get("sort") ?? "newest";
  const hydrateLocationLabelsIdle = useIdleHydration({ delay: 2_400 });
  const hydrateLocationLabels = currentView === "map" || hydrateLocationLabelsIdle;
  const hydrateCardEnhancements = useIdleHydration({ delay: 6_000 });
  const hasAttemptedScrollRestoreRef = useRef(false);
  const propertyTypesQuery = usePropertyTypes();

  const currentPage = Number(searchParams.get("page") ?? 1);
  const currentListUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const filters = {
    skip: (currentPage - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    search: searchParams.get("search") ?? undefined,
    listing_type: parseListingType(searchParams.get("listing_type")),
    listing_status: parseListingStatus(searchParams.get("listing_status")),
    moderation_status: MODERATION_STATUS.verified,
    min_price: searchParams.get("min_price")
      ? Number(searchParams.get("min_price"))
      : undefined,
    max_price: searchParams.get("max_price")
      ? Number(searchParams.get("max_price"))
      : undefined,
    bedrooms: searchParams.get("bedrooms")
      ? Number(searchParams.get("bedrooms"))
      : undefined,
    location_id: searchParams.get("location_id")
      ? Number(searchParams.get("location_id"))
      : undefined,
    property_type_id: (() => {
      const all = searchParams.getAll("property_type_id");
      if (all.length > 0) {
        const nums = all
          .flatMap((v) => v.split(","))
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
        return nums.length > 0 ? nums : undefined;
      }
      const single = searchParams.get("property_type_id");
      return single ? Number(single) : undefined;
    })(),
  };

  const { data, isLoading, isError, refetch } = useProperties(filters, initialData);
  const locationsQuery = useLocations(hydrateLocationLabels);

  const properties: Property[] = (data ?? []).filter((property) =>
    isVerifiedModerationStatus(property.moderation_status),
  );

  const sortedProperties = useMemo(() => {
    const byCreatedDesc = (a: Property, b: Property) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const byPriceAsc = (a: Property, b: Property) => Number(a.price) - Number(b.price);
    const byPriceDesc = (a: Property, b: Property) => Number(b.price) - Number(a.price);

    const copy = [...properties];
    if (sort === "price_low") return copy.sort(byPriceAsc);
    if (sort === "price_high") return copy.sort(byPriceDesc);
    return copy.sort(byCreatedDesc);
  }, [properties, sort]);
  const locationLabels = buildLocationLabelMap(locationsQuery.data ?? []);
  const total = sortedProperties.length;

  // Persist user's sort/view preferences
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("rn_sort", sort);
      }
    } catch {}
  }, [sort]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("rn_view", currentView);
      }
    } catch {}
  }, [currentView]);

  // Restore saved sort/view if not present in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    try {
      const savedSort = localStorage.getItem("rn_sort");
      if (savedSort && !params.has("sort")) {
        params.set("sort", savedSort);
        changed = true;
      }
    } catch {}

    try {
      const savedView = localStorage.getItem("rn_view");
      // Only persist map via URL; grid is the default when 'view' is absent
      if (savedView === "map" && !params.has("view")) {
        params.set("view", "map");
        changed = true;
      }
    } catch {}

    if (changed) {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
    // Run once on mount for restoration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    hasAttemptedScrollRestoreRef.current = false;
  }, [currentListUrl]);

  useEffect(() => {
    if (isLoading || hasAttemptedScrollRestoreRef.current) {
      return;
    }

    restorePropertiesScrollPosition(currentListUrl);
    hasAttemptedScrollRestoreRef.current = true;
  }, [currentListUrl, isLoading]);

  const handleNavigateToDetail = () => {
    savePropertiesScrollPosition(currentListUrl);
  };

  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const appliedChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; remove: () => void }> = [];
    const priceFormat = (n?: string | null) =>
      n && n.trim() ? `NGN ${Number(n).toLocaleString("en-NG")}` : null;

    const addChip = (key: string, label: string | null) => {
      if (!label) return;
      chips.push({ key, label, remove: () => updateParam(key, null) });
    };

    addChip("search", searchParams.get("search"));

    const lt = searchParams.get("listing_type");
    if (lt) addChip("listing_type", lt.charAt(0).toUpperCase() + lt.slice(1));

    const ls = searchParams.get("listing_status");
    if (ls) addChip("listing_status", ls.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()));

    addChip("min_price", priceFormat(searchParams.get("min_price")));
    addChip("max_price", priceFormat(searchParams.get("max_price")));

    const br = searchParams.get("bedrooms");
    if (br) addChip("bedrooms", `${br}+ beds`);

    const ptIds = searchParams.getAll("property_type_id");
    if (ptIds.length > 0) {
      const expanded = ptIds.flatMap((v) => v.split(","));
      expanded.forEach((id) => {
        const name = (propertyTypesQuery.data ?? []).find(
          (t) => String(t.property_type_id) === id,
        )?.name;
        addChip("property_type_id", name ?? `Type #${id}`);
      });
    } else {
      const ptId = searchParams.get("property_type_id");
      if (ptId) {
        const name = (propertyTypesQuery.data ?? []).find(
          (t) => String(t.property_type_id) === ptId,
        )?.name;
        addChip("property_type_id", name ?? `Type #${ptId}`);
      }
    }

    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const neighborhood = searchParams.get("neighborhood");
    if (state) addChip("state", state);
    if (city) addChip("city", city);
    if (neighborhood) addChip("neighborhood", neighborhood);

    const locId = searchParams.get("location_id");
    if (locId) addChip("location_id", `Location #${locId}`);

    return chips;
  }, [searchParams, propertyTypesQuery.data, updateParam]);

  const hasChips = appliedChips.length > 0;

  return (
    <div>
      <PropertyFilters />

      <div>
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Available properties
              </h2>
              {!isLoading ? (
                <p className="mt-0.5 text-sm text-gray-500">
                  {total > 0 ? `${total} listing${total !== 1 ? "s" : ""}` : ""}
                </p>
              ) : null}
              <p aria-live="polite" className="sr-only">{`Updated results: ${total} listing${total !== 1 ? "s" : ""}`}</p>
            </div>
            <div className="shrink-0">
              <label htmlFor="sort" className="mr-2 hidden text-sm font-medium text-gray-700 dark:text-gray-200 sm:inline">Sort by</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => updateParam("sort", e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {hasChips ? (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {appliedChips.map((chip) => (
                <button
                  key={`${chip.key}-${chip.label}`}
                  type="button"
                  onClick={chip.remove}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <span>{chip.label}</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 8.586 4.95 3.536 3.536 4.95 8.586 10l-5.05 5.05 1.414 1.414L10 11.414l5.05 5.05 1.414-1.414L11.414 10l5.05-5.05L15.05 3.536 10 8.586Z" clipRule="evenodd"/></svg>
                </button>
              ))}
              <button
                type="button"
                onClick={() => router.push(pathname)}
                className="ml-1 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-blue-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-blue-400"
              >
                Clear all
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {isError ? (
            <ErrorState
              title="Could not load properties"
              message="Check your connection and try again."
              onRetry={() => refetch()}
            />
          ) : null}

          {!isLoading && !isError && sortedProperties.length === 0 ? (
            <EmptyState
              title="No properties found"
              description="Try adjusting your filters or check back later."
              action={{
                label: "Clear filters",
                onClick: () => router.push("/properties"),
              }}
            />
          ) : null}

          {!isLoading && !isError && sortedProperties.length > 0 ? (
            <div className="min-h-[28rem]">
              {currentView === "map" ? (
                <PropertyMap
                  properties={sortedProperties}
                  filters={filters}
                  locations={locationsQuery.data ?? []}
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedProperties.map((property: Property) => (
                    <PropertyCard
                      key={property.property_id}
                      property={property}
                      hydrateEnhancements={hydrateCardEnhancements}
                      locationLabel={
                        property.location_id
                          ? locationLabels.get(property.location_id)
                          : undefined
                      }
                      onNavigateToDetail={handleNavigateToDetail}
                    />
                  ))}
                </div>
              )}
              {currentView === "grid" && total > PAGE_SIZE ? (
                <div className="mt-10">
                  <Pagination
                    total={total}
                    pageSize={PAGE_SIZE}
                    currentPage={currentPage}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
