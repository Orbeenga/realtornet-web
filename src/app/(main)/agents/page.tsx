import { Suspense } from "react";
import { Skeleton } from "@/components";
import { AgentDirectoryClient } from "@/features/agents/components";

function AgentsPageFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-28 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsPageFallback />}>
      <AgentDirectoryClient />
    </Suspense>
  );
}
