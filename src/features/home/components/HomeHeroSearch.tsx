"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationSearch } from "@/features/locations/hooks";
import type { ListingType, Location } from "@/types";
import { cn } from "@/lib/utils";

function locationLabel(location: Location) {
  return [location.neighborhood, location.city, location.state]
    .filter(Boolean)
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

    params.set("listing_type", listingType);
    router.push(`/properties?${params.toString()}`);
  };

  const selectLocation = (location: Location) => {
    setLocationQuery(locationLabel(location));
    setSelectedLocationId(location.location_id);
  };

  return (
    <div className="rounded-xl border border-white/20 bg-white/92 p-5 shadow-2xl backdrop-blur dark:bg-gray-950/88">
      <div className="space-y-4">
        <div className="relative">
          <label htmlFor="home-location-search" className="sr-only">
            Location
          </label>
          <Input
            id="home-location-search"
            value={locationQuery}
            onChange={(event) => {
              setLocationQuery(event.target.value);
              setSelectedLocationId(undefined);
            }}
            placeholder="Search neighbourhood or city in Lagos"
            autoComplete="off"
            className="h-12 bg-white dark:bg-gray-900"
          />
          {suggestions.length > 0 && !selectedLocationId ? (
            <ul
              className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
              role="listbox"
            >
              {suggestions.map((location) => (
                <li key={location.location_id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedLocationId === location.location_id}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={() => selectLocation(location)}
                  >
                    {locationLabel(location)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          {(["sale", "rent"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-semibold capitalize transition-colors",
                listingType === type
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
              )}
              onClick={() => setListingType(type)}
            >
              {type === "sale" ? "Buy" : "Rent"}
            </button>
          ))}
        </div>

        <Button type="button" className="h-12 w-full" onClick={handleSearch}>
          Search properties
        </Button>
      </div>
    </div>
  );
}
