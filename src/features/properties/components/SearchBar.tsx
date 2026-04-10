"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
}

function SearchInput({ initialValue, onCommit }: SearchInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="relative flex items-center">
      <svg
        className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        />
      </svg>
      <input
        type="text"
        aria-label="Search properties"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit(value);
          }
        }}
        onBlur={() => onCommit(value)}
        placeholder="Search properties by title or keyword..."
        className={cn(
          "h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-base text-gray-900 shadow-sm transition-shadow duration-150",
          "border-[1.5px] border-gray-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none focus:shadow-md",
          "placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500",
        )}
      />
    </div>
  );
}

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (nextValue: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextValue) {
        params.set("search", nextValue);
      } else {
        params.delete("search");
      }

      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto mb-6 w-full max-w-2xl">
      <SearchInput
        key={searchParams.get("search") ?? ""}
        initialValue={searchParams.get("search") ?? ""}
        onCommit={updateFilter}
      />
    </div>
  );
}
