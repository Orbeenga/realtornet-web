"use client";

import { useState } from "react";
import { Button, Skeleton } from "@/components";
import { useReplies, useReplyToInquiry } from "@/features/inquiries/hooks";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ReplyBubble({
  body,
  authorDisplayName,
  authorRole,
  createdAt,
  editedAt,
  isOwn,
}: {
  body: string;
  authorDisplayName: string;
  authorRole: string;
  createdAt: string;
  editedAt: string | null | undefined;
  isOwn: boolean;
}) {
  const isAgent =
    authorRole === "agent" || authorRole === "agency_owner" || authorRole === "admin";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isOwn
            ? "bg-emerald-500 text-white"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium opacity-80">
            {isOwn ? "You" : authorDisplayName}
          </span>
          {!isOwn && isAgent ? (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide dark:bg-gray-700/50">
              Agent
            </span>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{body}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] opacity-60">{formatDate(createdAt)}</span>
          {editedAt ? (
            <span className="text-[10px] italic opacity-50">edited</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RepliesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="ml-12 h-20 w-3/4 rounded-2xl" />
      <Skeleton className="mr-12 h-16 w-1/2 rounded-2xl" />
      <Skeleton className="ml-12 h-24 w-2/3 rounded-2xl" />
    </div>
  );
}

export function ReplyThread({
  inquiryId,
  inquiryStatus,
  currentUserId,
}: {
  inquiryId: number;
  inquiryStatus: string;
  currentUserId?: number | null;
}) {
  const [replyBody, setReplyBody] = useState("");
  const { data: replies, isLoading, isError } = useReplies(inquiryId);
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

  const canReply = inquiryStatus !== "responded";

  return (
    <div className="space-y-4">
      {isLoading ? (
        <RepliesSkeleton />
      ) : isError ? (
        <p className="text-sm text-red-500">Failed to load replies</p>
      ) : replies && replies.length > 0 ? (
        <div className="space-y-3">
          {replies.map((reply) => (
            <ReplyBubble
              key={reply.reply_id}
              body={reply.body}
              authorDisplayName={reply.author_display_name}
              authorRole={reply.author_role}
              createdAt={reply.created_at}
              editedAt={reply.edited_at}
              isOwn={
                typeof currentUserId === "number" &&
                reply.author_id === currentUserId
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          No replies yet
        </p>
      )}

      {canReply ? (
        <div className="space-y-3 pt-2">
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
      ) : null}
    </div>
  );
}
