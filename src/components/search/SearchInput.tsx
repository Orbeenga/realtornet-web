"use client";

import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function SearchInput({ value, onChange, placeholder, ariaLabel }: SearchInputProps) {
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
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-base text-gray-900 shadow-sm transition-shadow duration-150",
          "border-[1.5px] border-gray-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none focus:shadow-md",
          "placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500",
        )}
      />
    </div>
  );
}
