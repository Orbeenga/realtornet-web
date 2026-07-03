"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/search/FilterBar";
import { UI_TOKENS } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { PropertyFiltersSavedSearch } from "./PropertyFiltersSavedSearch";

interface SearchInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  className?: string;
}

function SearchInput({ initialValue, onCommit, className }: SearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onCommit(value);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, onCommit]);

  return (
    <form
      className={cn("flex min-w-0 items-center gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onCommit(value);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label="Search properties"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => onCommit(value)}
          placeholder="Search by title, keyword, or area"
          autoComplete="off"
          enterKeyHint="search"
          inputMode="search"
          className={cn(
            UI_TOKENS.SEARCH_INPUT,
            "w-full rounded-xl border border-gray-200 bg-white pr-4 pl-11 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          )}
        />
      </div>
      <Button type="submit" className={cn(UI_TOKENS.SEARCH_BUTTON, "hidden shrink-0 px-5 lg:inline-flex")}>
        Search
      </Button>
    </form>
  );
}

export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const plainSearchParams = new URLSearchParams(searchParams.toString());
  plainSearchParams.delete("view");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollYRef = useRef<number | null>(null);

  const updateFilterDebounced = useCallback(
    (key: string, value: string) => {
      pendingScrollYRef.current = window.scrollY;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateFilter(key, value);
      }, 350);
    },
    [updateFilter],
  );

  useEffect(() => {
    if (pendingScrollYRef.current === null) {
      return;
    }

    const scrollY = pendingScrollYRef.current;
    pendingScrollYRef.current = null;
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, [searchParams]);

  const currentView = searchParams.get("view") === "map" ? "map" : "grid";
  const viewHref = (view: "grid" | "map") => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("view", view);
    params.delete("page");

    if (view === "grid") {
      params.delete("view");
    }

    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  };
  const viewToggle = (
    <div className="inline-flex h-11 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {(["grid", "map"] as const).map((view) => (
        <Link
          key={view}
          href={viewHref(view)}
          prefetch={false}
          className={cn(
            "inline-flex min-w-16 items-center justify-center px-3 text-sm font-medium transition",
            currentView === view
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
          )}
        >
          {view === "grid" ? "Grid" : "Map"}
        </Link>
      ))}
    </div>
  );

  const search = searchParams.get("search") || "";
  const searchInput = (
    <SearchInput
      key={search}
      initialValue={search}
      onCommit={(value) => updateFilterDebounced("search", value)}
      className="w-full"
    />
  );

  const actions = (
    <div className="flex w-full items-center justify-between">
      <div>{viewToggle}</div>
      <div className="shrink-0">
        <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact />
      </div>
    </div>
  );

  return (
    <div className="mb-8" data-rn-prop-filter-row>
      <FilterBar
        variant="default"
        showLocationSelector
        searchInput={searchInput}
        actions={actions}
      />
    </div>
  );
}
