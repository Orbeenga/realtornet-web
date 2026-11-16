"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar, type FilterBarHandle } from "@/components/search/FilterBar";
import { useLocationSearch } from "@/features/locations/hooks";
import { useHomeSearch } from "./HomeSearchContext";
import { buildDiscoveryLocationParams, isSelectedSuggestion } from "../lib/discoveryParams";
import { suggestionKey } from "@/features/locations/lib/locationSuggestion";
import type { LocationSearchResult } from "@/types";

export function HomeHeroSearch() {
  const router = useRouter();
  const { searchQuery: locationQuery, setSearchQuery: setLocationQuery, selectedLocation, setSelectedLocation } = useHomeSearch();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchQuery = useLocationSearch(debouncedQuery);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filterBarRef = useRef<FilterBarHandle>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const suggestions = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery), 150);
    return () => clearTimeout(t);
  }, [locationQuery]);

  useEffect(() => {
    if (suggestions.length > 0 && !selectedLocation && searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [suggestions, selectedLocation, locationQuery]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();

    // Location params: a picked suggestion navigates the state/city triple
    // (precise filter wins, keyword dropped); free text navigates ?search=.
    const locationParams = buildDiscoveryLocationParams({
      queryText: locationQuery,
      selection: selectedLocation,
    });
    for (const [key, value] of locationParams.entries()) {
      params.append(key, value);
    }

    // Filter params from FilterBar
    if (filterBarRef.current) {
      const filterParams = filterBarRef.current.getFilterParams();
      for (const [key, value] of filterParams.entries()) {
        params.append(key, value);
      }
    }

    try {
      if (typeof window !== "undefined") {
        const savedSort = localStorage.getItem("rn_sort");
        if (savedSort && !params.has("sort")) params.set("sort", savedSort);
        const savedView = localStorage.getItem("rn_view");
        if (savedView === "map" && !params.has("view")) params.set("view", "map");
      }
    } catch {}

    const query = params.toString();
    router.push(query ? `/properties/?${query}` : "/properties/");
  };

  const selectLocation = (location: LocationSearchResult) => {
    setLocationQuery(location.display_name);
    setSelectedLocation({
      state: location.state,
      city: location.city,
      neighborhood: location.neighborhood ?? null,
    });
  };

  const searchInput = (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="home-location-search" className="sr-only">
        Search location
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <Input
        ref={searchInputRef}
        id="home-location-search"
        value={locationQuery}
        onChange={(event) => {
          setLocationQuery(event.target.value);
          setSelectedLocation(null);
        }}
        placeholder="Search by title, keyword, or area"
        autoComplete="off"
        className="h-14 w-full rounded-xl border border-gray-200 bg-white pr-4 pl-12 text-base text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      {suggestions.length > 0 && !selectedLocation && typeof window !== "undefined" ? (
        createPortal(
          <ul
            className="fixed z-50 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            role="listbox"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {suggestions.map((location) => (
              <li key={suggestionKey(location)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelectedSuggestion(selectedLocation, location)}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => selectLocation(location)}
                >
                  {location.display_name}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <form className="mx-auto w-full max-w-[60rem]" onSubmit={handleSearch}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {searchInput}
          <Button
            type="submit"
            className="hidden h-14 shrink-0 rounded-xl bg-gray-400 px-8 text-base font-medium text-white hover:bg-gray-500 lg:inline-flex"
          >
            Search
          </Button>
        </div>
      </form>

      <FilterBar
        ref={filterBarRef}
        variant="hero"
        searchQuery={locationQuery}
        selectedLocation={selectedLocation}
      />
    </div>
  );
}
