import { Skeleton } from "@/components";

export function AgencyOwnerDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-64" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-3 dark:border-gray-800">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-32 rounded-lg" />
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgencyOwnerTabListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function AgencyOwnerRosterSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-lg" />
      ))}
    </div>
  );
}
