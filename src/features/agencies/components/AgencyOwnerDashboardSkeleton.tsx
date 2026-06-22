import { Skeleton } from "@/components";

export function AgencyOwnerDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-10 px-6">
      <div className="space-y-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
        <div className="mt-5 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-3 dark:border-gray-800">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[120px] rounded-xl" />
        ))}
      </div>

      <div>
        <Skeleton className="mb-5 h-5 w-36" />
        <Skeleton className="h-40 w-full rounded-xl" />
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
