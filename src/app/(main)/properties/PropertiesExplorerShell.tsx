import { Suspense } from "react";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { PropertiesExplorer } from "@/features/properties/components/PropertiesExplorer";

function PropertiesExplorerFallback() {
  return (
    <div className="space-y-6">
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-2">
          <div className="h-11 min-w-0 flex-1 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-11 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-11 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-11 w-32 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function PropertiesExplorerShell() {
  return (
    <Suspense fallback={<PropertiesExplorerFallback />}>
      <PropertiesExplorer />
    </Suspense>
  );
}
