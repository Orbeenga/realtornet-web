import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components";
import { AgentDirectoryClient } from "@/features/agents/components";

export const metadata: Metadata = {
  title: "Property Agents in Lagos",
  description: "Find verified real estate agents in Lagos on RealtorNet.",
  openGraph: {
    title: "Property Agents in Lagos | RealtorNet",
    description: "Find verified real estate agents in Lagos on RealtorNet.",
    url: "/agents",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

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
