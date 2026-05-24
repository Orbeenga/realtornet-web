"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationSearch } from "@/features/locations/hooks";
import {
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

export function HomeHeroSearch() {
  const router = useRouter();
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [listingType, setListingType] = useState<ListingType>("sale");
  const searchQuery = useLocationSearch(locationQuery);

  const suggestions = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (typeof selectedLocationId === "number") {
      params.set("location_id", String(selectedLocationId));
    }

    if (listingType) {
      params.set("listing_type", listingType);
    }

    const query = params.toString();
    router.push(query ? `/properties/?${query}` : "/properties/");
  };

  const selectLocation = (location: Location) => {
    setLocationQuery(locationLabel(location));
    setSelectedLocationId(location.location_id);
  };

  return (
    <section className="bg-gray-50 px-4 py-5 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex h-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {LISTING_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "min-w-20 px-4 text-sm font-semibold transition",
                listingType === type
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
              )}
              onClick={() => setListingType(type)}
            >
              {TAB_LABELS[type] ?? LISTING_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <form
          className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <label htmlFor="home-location-search" className="sr-only">
              Location
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="home-location-search"
              value={locationQuery}
              onChange={(event) => {
                setLocationQuery(event.target.value);
                setSelectedLocationId(undefined);
              }}
              placeholder="Search neighbourhood or city in Nigeria"
              autoComplete="off"
              className="h-12 rounded-xl bg-white pl-11 dark:bg-gray-900"
            />
            {suggestions.length > 0 && !selectedLocationId ? (
              <ul
                className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
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

          <Button type="submit" className="h-12 shrink-0 px-6">
            Search properties
          </Button>
        </form>
      </div>
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