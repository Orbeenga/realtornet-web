import { Suspense } from "react";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { PropertiesExplorer } from "@/features/properties/components/PropertiesExplorer";
import type { PaginatedProperties } from "@/types";

function PropertiesExplorerFallback() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function PropertiesExplorerShell({
  initialData,
}: {
  initialData?: PaginatedProperties | null;
}) {
  return (
    <Suspense fallback={<PropertiesExplorerFallback />}>
      <PropertiesExplorer initialData={initialData} />
    </Suspense>
  );
}
