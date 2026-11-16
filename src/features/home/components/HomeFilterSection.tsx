"use client";

import { useHomeSearch } from "./HomeSearchContext";
import { FilterBar } from "@/components/search/FilterBar";

export function HomeFilterSection() {
  const { searchQuery, selectedLocation } = useHomeSearch();

  return (
    <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <FilterBar
          variant="hero"
          searchQuery={searchQuery}
          selectedLocation={selectedLocation}
        />
      </div>
    </section>
  );
}
