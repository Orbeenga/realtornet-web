"use client";

import dynamic from "next/dynamic";
import { PropertyCardSkeleton } from "@/components/Skeleton";

function PropertiesExplorerFallback() {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

const DynamicPropertiesExplorer = dynamic(
  () =>
    import("@/features/properties/components/PropertiesExplorer").then(
      (mod) => mod.PropertiesExplorer,
    ),
  {
    ssr: false,
    loading: PropertiesExplorerFallback,
  },
);

export function PropertiesExplorerShell() {
  return <DynamicPropertiesExplorer />;
}
