"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components";
import {
  useInquiryDirectory,
  useMarkInquiryViewed,
  useReplyToInquiry,
  type InquiryDirectorySource,
} from "@/features/inquiries/hooks";
import type { InquiryDirectoryItem } from "@/features/inquiries/hooks/useInquiryDirectory";
import type { InquiryReplyResponse } from "@/types";

interface ReceivedInquiriesListProps {
  source: Exclude<InquiryDirectorySource, "sent">;
  agencyId?: number;
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

function formatReplyDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function InquiryReplySection({
  inquiryId,
  inquiryStatus,
  replyCount,
  latestReply,
}: {
  inquiryId: number;
  inquiryStatus: string;
  replyCount: number;
  latestReply: InquiryReplyResponse | null;
}) {
  const [replyBody, setReplyBody] = useState("");
  const replyToInquiry = useReplyToInquiry();

  const handleSendReply = async () => {
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    try {
      await replyToInquiry.mutateAsync({ inquiryId, body: trimmed });
      setReplyBody("");
    } catch {
      // Error handled by the mutation
    }
  };

  if (replyCount > 0 && latestReply) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Your reply
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
          {latestReply.body}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {latestReply.author_display_name} &middot;{" "}
          {formatReplyDate(latestReply.created_at)}
        </p>
      </div>
    );
  }

  if (inquiryStatus === "responded") {
    return null;
  }

  return (
    <div className="space-y-3">
      <textarea
        value={replyBody}
        onChange={(e) => setReplyBody(e.target.value)}
        placeholder="Type your reply..."
        rows={3}
        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-700 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={replyToInquiry.isPending}
          disabled={!replyBody.trim()}
          onClick={() => void handleSendReply()}
        >
          Send reply
        </Button>
      </div>
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
                  {contact?.fullName ?? "Seeker"}
                </p>
                <p>{contact?.email ?? "Email unavailable"}</p>
                <p>{contact?.phoneNumber ?? "Phone unavailable"}</p>
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
            </div>
          </div>

          {isExpanded ? (
            <>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-950/40">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Inquiry
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                  {inquiry.message ?? "No message provided."}
                </p>
              </div>
              {showStatusActions ? (
                <div className="mt-4">
                  <InquiryReplySection
                    inquiryId={inquiry.inquiry_id}
                    inquiryStatus={inquiry.inquiry_status}
                    replyCount={inquiry.reply_count}
                    latestReply={inquiry.latest_reply ?? null}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReceivedInquiriesList({
  source,
  agencyId,
  emptyTitle,
  emptyDescription,
  showStatusActions = true,
}: ReceivedInquiriesListProps) {
  const inquiryDirectory = useInquiryDirectory(source, { agencyId });

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

  if (inquiryDirectory.hasLoadedEmpty || inquiryDirectory.items.length === 0) {
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
