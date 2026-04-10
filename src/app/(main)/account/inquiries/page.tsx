"use client";

import Link from "next/link";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import { useInquiryFeed } from "@/features/inquiries/hooks";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function InquiryListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function InquiriesPage() {
  const inquiryFeed = useInquiryFeed();

  return (
    <div className="mx-auto max-w-[800px] space-y-8">
      <div className="space-y-3">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to listings
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Your inquiries
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track the messages you&apos;ve sent to agents about listings.
          </p>
        </div>
      </div>

      {inquiryFeed.isLoading ? <InquiryListSkeleton /> : null}

      {!inquiryFeed.isLoading && inquiryFeed.isError ? (
        <ErrorState
          title="Could not load inquiries"
          message="There was a problem loading your inquiries. Please try again."
          onRetry={() => {
            void inquiryFeed.refetch();
          }}
        />
      ) : null}

      {!inquiryFeed.isLoading && !inquiryFeed.isError && inquiryFeed.items.length === 0 ? (
        <EmptyState
          title="You haven't sent any inquiries yet"
          description="When you message an agent from a property detail page, it will appear here."
        />
      ) : null}

      {!inquiryFeed.isLoading && !inquiryFeed.isError && inquiryFeed.items.length > 0 ? (
        <div className="space-y-4">
          {inquiryFeed.items.map(({ inquiry, property }) => (
            <Link
              key={inquiry.inquiry_id}
              href={
                typeof inquiry.property_id === "number"
                  ? `/properties/${inquiry.property_id}`
                  : "/properties"
              }
              className="block"
            >
              <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                        {property?.title ?? "Property listing"}
                      </h2>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {inquiry.inquiry_status}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {inquiry.message ?? "No message preview available."}
                    </p>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(inquiry.created_at)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
