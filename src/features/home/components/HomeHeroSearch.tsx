"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationSearch } from "@/features/locations/hooks";
import { usePropertyTypes } from "@/features/properties/hooks";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
} from "@/features/properties/lib/propertyOptions";
import type { ListingType, Location } from "@/types";
import { cn } from "@/lib/utils";

const TAB_LABELS: Record<ListingType, string> = {
  sale: "Buy",
  rent: "Rent",
  lease: "Lease",
};

const PRICE_OPTIONS = [
  { value: "500000", label: "NGN 500k" },
  { value: "1000000", label: "NGN 1m" },
  { value: "2500000", label: "NGN 2.5m" },
  { value: "5000000", label: "NGN 5m" },
  { value: "10000000", label: "NGN 10m" },
  { value: "15000000", label: "NGN 15m" },
  { value: "25000000", label: "NGN 25m" },
  { value: "50000000", label: "NGN 50m" },
];

const BEDROOM_OPTIONS = [
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

function optionLabel(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function locationLabel(location: Location) {
  return [location.neighborhood, location.city, location.state]
    .filter(Boolean)
    .map((value) => optionLabel(String(value)))
    .join(", ");
}

function HomeFilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0 flex-1" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm outline-none transition hover:border-blue-200 hover:text-blue-700 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        {children}
      </select>
    </label>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold text-slate-800 dark:text-slate-200"
      >
        {label}
      </label>
      {children}
    </div>
  );
}


export function HomeHeroSearch() {
  const router = useRouter();
  const propertyTypesQuery = usePropertyTypes();
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [listingStatus, setListingStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchQuery = useLocationSearch(locationQuery);

  const suggestions = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const buildQuery = () => {
    const params = new URLSearchParams();

    if (locationQuery.trim()) {
      params.set("search", locationQuery.trim());
    }

    if (typeof selectedLocationId === "number") {
      params.set("location_id", String(selectedLocationId));
      params.delete("search");
    }

    if (listingType) {
      params.set("listing_type", listingType);
    }

    if (propertyTypeId) {
      params.set("property_type_id", propertyTypeId);
    }

    if (minPrice) {
      params.set("min_price", minPrice);
    }

    if (maxPrice) {
      params.set("max_price", maxPrice);
    }

    if (bedrooms) {
      params.set("bedrooms", bedrooms);
    }

    if (listingStatus) {
      params.set("listing_status", listingStatus);
    }

    return params.toString();
  };

  const handleSearch = () => {
    const query = buildQuery();
    router.push(query ? `/properties/?${query}` : "/properties/");
  };

  const clearFilters = () => {
    setPropertyTypeId("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setListingStatus("");
  };

  const selectLocation = (location: Location) => {
    setLocationQuery(locationLabel(location));
    setSelectedLocationId(location.location_id);
  };

  const searchInput = (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="home-location-search" className="sr-only">
        Search location
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-500" />
      <Input
        id="home-location-search"
        value={locationQuery}
        onChange={(event) => {
          setLocationQuery(event.target.value);
          setSelectedLocationId(undefined);
        }}
        placeholder="Search for a city, suburb or neighbourhood"
        autoComplete="off"
        className="h-14 border-0 bg-transparent pl-12 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {suggestions.length > 0 && !selectedLocationId ? (
        <ul
          className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          role="listbox"
        >
          {suggestions.map((location) => (
            <li key={location.location_id}>
              <button
                type="button"
                role="option"
                aria-selected={selectedLocationId === location.location_id}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => selectLocation(location)}
              >
                {locationLabel(location)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <section className="px-4 py-5 sm:px-6 lg:px-8">
      <form
        className="mx-auto max-w-7xl space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
      >
        <div className="grid gap-3 lg:grid-cols-2 lg:items-center">
          <div className="inline-flex h-14 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-950">
            {LISTING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={cn(
                  "min-w-20 flex-1 rounded-xl px-4 text-sm font-semibold transition",
                  listingType === type
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                )}
                onClick={() => setListingType(type)}
              >
                {TAB_LABELS[type] ?? LISTING_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-950">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              {searchInput}
              <Button type="submit" className="h-14 shrink-0 rounded-xl px-8 text-base">
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <HomeFilterSelect
            id="home-property-type"
            label="Property Type"
            value={propertyTypeId}
            onChange={setPropertyTypeId}
            disabled={propertyTypesQuery.isLoading || propertyTypesQuery.isError}
          >
            <option value="">
              {propertyTypesQuery.isLoading
                ? "Loading property types..."
                : propertyTypesQuery.isError
                  ? "Property types unavailable"
                  : "Property Type"}
            </option>
            {(propertyTypesQuery.data ?? []).map((propertyType) => (
              <option key={propertyType.property_type_id} value={propertyType.property_type_id}>
                {propertyType.name}
              </option>
            ))}
          </HomeFilterSelect>

          <HomeFilterSelect
            id="home-min-price"
            label="Min Price"
            value={minPrice}
            onChange={setMinPrice}
          >
            <option value="">Min Price</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HomeFilterSelect>

          <HomeFilterSelect
            id="home-max-price"
            label="Max Price"
            value={maxPrice}
            onChange={setMaxPrice}
          >
            <option value="">Max Price</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HomeFilterSelect>

          <HomeFilterSelect
            id="home-bedrooms"
            label="Bedrooms"
            value={bedrooms}
            onChange={setBedrooms}
          >
            <option value="">Bedrooms</option>
            {BEDROOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HomeFilterSelect>

          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:border-blue-200 hover:bg-gray-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </form>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-filter-dialog-title"
            className="mx-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-950"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2
                id="home-filter-dialog-title"
                className="text-lg font-semibold text-slate-950 dark:text-white"
              >
                Filters
              </h2>
              <button
                type="button"
                aria-label="Close filters"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                onClick={() => setFiltersOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 px-6 py-6 dark:border-gray-800">{searchInput}</div>

            <div className="space-y-6 overflow-y-auto px-6 py-5">
              <FilterField id="home-modal-listing-status" label="Listing Status">
                <select
                  id="home-modal-listing-status"
                  value={listingStatus}
                  onChange={(event) => setListingStatus(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">All statuses</option>
                  {LISTING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {LISTING_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </FilterField>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear All
              </Button>
              <Button
                type="button"
                className="h-12 min-w-36 rounded-lg px-6"
                onClick={() => {
                  setFiltersOpen(false);
                  handleSearch();
                }}
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function HomeHierarchyCard() {
  return (
    <div className="w-full max-w-[420px] rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-gray-950/90">
      <p className="text-sm font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-300">
        Public hierarchy
      </p>
      <h2 className="mt-5 text-3xl leading-tight font-bold text-gray-950 dark:text-white">
        Agencies to listings to agents
      </h2>
      <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
        Start with a trusted organization, compare its active inventory, then
        contact the agent accountable for the listing.
      </p>
      <div className="mt-6 space-y-4">
        {[
          "Choose a verified agency",
          "Review its active listings",
          "Contact the listing agent",
        ].map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl bg-white px-4 py-4 shadow-sm dark:bg-gray-900"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}