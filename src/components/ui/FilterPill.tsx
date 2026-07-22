"use client";

import { cloneElement, forwardRef, isValidElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FilterPillProps {
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}

const PILL_BASE =
  "inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 h-12 text-sm font-medium text-gray-800 bg-white shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:text-blue-400 cursor-pointer";

export const FilterPill = forwardRef<HTMLButtonElement, FilterPillProps & React.ComponentPropsWithoutRef<"button">>(
  function FilterPill({ asChild = false, className, children, ...props }, ref) {
    if (asChild && isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return cloneElement(child, {
        className: cn(PILL_BASE, className, child.props.className),
        ...props,
      });
    }

    return (
      <button ref={ref} className={cn(PILL_BASE, className)} {...props}>
        {children}
      </button>
    );
  },
);
