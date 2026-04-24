"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components";
import {
  useInquiryDirectory,
  useMarkInquiryViewed,
  useUpdateInquiryStatus,
  type InquiryDirectorySource,
} from "@/features/inquiries/hooks";
import type { InquiryDirectoryItem } from "@/features/inquiries/hooks/useInquiryDirectory";
import type { InquiryStatus } from "@/types";

interface ReceivedInquiriesListProps {
  source: Exclude<InquiryDirectorySource, "sent">;
  emptyTitle: string;
  emptyDescription: string;
  showStatusActions?: boolean;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariantClasses(status: string) {
  if (status === "responded") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (status === "viewed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
}

function formatReceivedInquiryStatus(status: string) {
  if (status === "responded") {
    return "Responded";
  }

  if (status === "viewed") {
    return "Viewed";
  }

  return "New";
}

function InquiryListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-56 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function InquiryStatusActions({
  inquiryId,
  inquiryStatus,
}: {
  inquiryId: number;
  inquiryStatus: string;
}) {
  const updateInquiryStatus = useUpdateInquiryStatus();

  const handleStatusUpdate = async (status: InquiryStatus) => {
    await updateInquiryStatus.mutateAsync({ inquiryId, status });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {inquiryStatus !== "responded" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={
            updateInquiryStatus.isPending &&
            updateInquiryStatus.variables?.inquiryId === inquiryId &&
            updateInquiryStatus.variables?.status === "responded"
          }
          onClick={() => void handleStatusUpdate("responded")}
        >
          Mark Responded
        </Button>
      ) : null}
    </div>
  );
}

function ReceivedInquiryCard({
  inquiry,
  property,
  propertyImage,
  contact,
  showStatusActions,
}: InquiryDirectoryItem & { showStatusActions: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const markInquiryViewed = useMarkInquiryViewed();

  const handleToggleExpand = async () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (
      nextExpanded &&
      inquiry.inquiry_status === "new" &&
      !markInquiryViewed.isPending
    ) {
      try {
        await markInquiryViewed.mutateAsync(inquiry.inquiry_id);
      } catch {
        // Keep the inquiry open even if the passive status update fails.
      }
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row">
        <Link
          href={
            typeof inquiry.property_id === "number"
              ? `/properties/${inquiry.property_id}`
              : "/properties"
          }
          className="flex gap-4 md:w-[20rem] md:flex-none"
        >
          <div className="h-24 w-24 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            {propertyImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={propertyImage.image_url}
                alt={propertyImage.caption ?? property?.title ?? "Property image"}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Property
            </p>
            <h2 className="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
              {property?.title ?? "Property listing"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Open listing
            </p>
          </div>
        </Link>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusVariantClasses(
                    inquiry.inquiry_status,
                  )}`}
                >
                  {formatReceivedInquiryStatus(inquiry.inquiry_status)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Received {formatDate(inquiry.created_at)}
                </span>
              </div>
              <div className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white">
                  {contact
                    ? `${contact.first_name} ${contact.last_name}`.trim()
                    : "Seeker"}
                </p>
                <p>{contact?.email ?? "Email unavailable"}</p>
                <p>{contact?.phone_number ?? "Phone unavailable"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={
                  inquiry.inquiry_status === "new" &&
                  markInquiryViewed.isPending &&
                  markInquiryViewed.variables === inquiry.inquiry_id
                }
                onClick={() => void handleToggleExpand()}
              >
                {isExpanded ? "Hide inquiry" : "Open inquiry"}
              </Button>
              {showStatusActions ? (
                <InquiryStatusActions
                  inquiryId={inquiry.inquiry_id}
                  inquiryStatus={inquiry.inquiry_status}
                />
              ) : null}
            </div>
          </div>

          {isExpanded ? (
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-950/40">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Inquiry
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                {inquiry.message ?? "No message provided."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReceivedInquiriesList({
  source,
  emptyTitle,
  emptyDescription,
  showStatusActions = true,
}: ReceivedInquiriesListProps) {
  const inquiryDirectory = useInquiryDirectory(source);

  if (inquiryDirectory.isLoading) {
    return <InquiryListSkeleton />;
  }

  if (inquiryDirectory.isError) {
    return (
      <ErrorState
        title="Could not load inquiries"
        message="There was a problem loading inbound inquiries. Please try again."
        onRetry={() => {
          void inquiryDirectory.refetch();
        }}
      />
    );
  }

  if (inquiryDirectory.items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {inquiryDirectory.items.map((item) => (
        <ReceivedInquiryCard
          key={item.inquiry.inquiry_id}
          {...item}
          showStatusActions={showStatusActions}
        />
      ))}
    </div>
  );
}
