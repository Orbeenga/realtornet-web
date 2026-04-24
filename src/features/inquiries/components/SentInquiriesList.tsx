"use client";

import Link from "next/link";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import { useInquiryDirectory } from "@/features/inquiries/hooks";

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

function getSentInquiryStatusLabel(status: string) {
  if (status === "responded") {
    return "Agent responded";
  }

  if (status === "viewed") {
    return "Viewed by agent";
  }

  return "Awaiting response";
}

function getSentInquiryStatusClasses(status: string) {
  if (status === "responded") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (status === "viewed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
}

export function SentInquiriesList() {
  const inquiryDirectory = useInquiryDirectory("sent");

  if (inquiryDirectory.isLoading) {
    return <InquiryListSkeleton />;
  }

  if (inquiryDirectory.isError) {
    return (
      <ErrorState
        title="Could not load inquiries"
        message="There was a problem loading your inquiries. Please try again."
        onRetry={() => {
          void inquiryDirectory.refetch();
        }}
      />
    );
  }

  if (inquiryDirectory.items.length === 0) {
    return (
      <EmptyState
        title="You haven't sent any inquiries yet"
        description="When you contact an agent from a property detail page, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {inquiryDirectory.items.map(({ inquiry, property }) => (
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
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSentInquiryStatusClasses(
                      inquiry.inquiry_status,
                    )}`}
                  >
                    {getSentInquiryStatusLabel(inquiry.inquiry_status)}
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
  );
}
