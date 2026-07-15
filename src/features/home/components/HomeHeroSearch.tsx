"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/search/FilterBar";
import { useLocationSearch } from "@/features/locations/hooks";
import type { Location } from "@/types";

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const searchQuery = useLocationSearch(debouncedQuery);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const suggestions = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery), 150);
    return () => clearTimeout(t);
  }, [locationQuery]);

  useEffect(() => {
    if (suggestions.length > 0 && !selectedLocationId && searchInputRef.current) {
      // The suggestion list is `position: fixed`, so coordinates must be
      // viewport-relative. getBoundingClientRect() already returns viewport
      // coords — adding scrollY/scrollX here would detach the dropdown from the
      // input the moment the page is scrolled.
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [suggestions, selectedLocationId, locationQuery]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    if (locationQuery.trim()) {
      params.set("search", locationQuery.trim());
    }

    if (typeof selectedLocationId === "number") {
      params.set("location_id", String(selectedLocationId));
      params.delete("search");
    }

    for (const [key, value] of formData.entries()) {
      if (value && value !== "all" && value !== "custom" && key !== "search" && key !== "location_id") {
        params.append(key, value as string);
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

  const selectLocation = (location: Location) => {
    setLocationQuery(locationLabel(location));
    setSelectedLocationId(location.location_id);
  };

  const searchInput = (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="home-location-search" className="sr-only">
        Search location
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        ref={searchInputRef}
        id="home-location-search"
        value={locationQuery}
        onChange={(event) => {
          setLocationQuery(event.target.value);
          setSelectedLocationId(undefined);
        }}
        placeholder="Search by title, keyword, or area"
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-gray-200 bg-white pr-4 pl-11 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      {suggestions.length > 0 && !selectedLocationId && typeof window !== "undefined" ? (
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
          </ul>,
          document.body,
        )
      ) : null}
    </div>
  );

  return (
    <form
      className="mx-auto w-full max-w-2xl space-y-5"
      onSubmit={handleSearch}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {searchInput}
        <Button
          type="submit"
          className="hidden h-12 shrink-0 rounded-xl bg-gray-400 px-5 text-sm font-medium text-white hover:bg-gray-500 lg:inline-flex"
        >
          Search
        </Button>
      </div>

      <FilterBar variant="hero" />
    </form>
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
