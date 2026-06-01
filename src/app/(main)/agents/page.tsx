import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components";
import Link from "next/link";
import { AgentDirectoryClient } from "@/features/agents/components";
import { buildAgentDirectoryPath } from "@/features/agents/hooks/useAgentDirectory";
import { serverPublicApi } from "@/lib/api/serverPublic";
import type { AgentDirectoryResponse } from "@/types";

export const metadata: Metadata = {
  title: "Property Agents in Nigeria",
  description: "Find verified real estate agents in Nigeria on RealtorNet.",
  alternates: {
    canonical: "https://realtornet-web.vercel.app/agents/",
  },
  openGraph: {
    title: "Property Agents in Nigeria | RealtorNet",
    description: "Find verified real estate agents in Nigeria on RealtorNet.",
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
        <Skeleton className="h-8 w-40 sm:h-9" />
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

interface AgentsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  await searchParams;
  const initialData = await serverPublicApi<AgentDirectoryResponse[]>(
    buildAgentDirectoryPath({ limit: 24 }),
    60,
  );

  return (
    <Suspense fallback={<AgentsPageFallback />}>
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg px-2 py-1">
        Home
      </Link>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://realtornet-web.vercel.app/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Agents",
                item: "https://realtornet-web.vercel.app/agents/",
              },
            ],
          }),
        }}
      />
      <AgentDirectoryClient initialData={initialData} />
    </Suspense>
  );
}
