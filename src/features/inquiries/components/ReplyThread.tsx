"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Skeleton } from "@/components";
import { useReplies, useReplyToInquiry } from "@/features/inquiries/hooks";
import type { InquiryReplyResponse } from "@/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function QuotedPreview({ reply, onClear }: { reply: InquiryReplyResponse; onClear: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border-l-4 border-emerald-400 bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {reply.author_display_name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {reply.body}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Cancel reply"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ParentReplyBanner({ parentReply }: { parentReply: InquiryReplyResponse }) {
  return (
    <div className="mb-1 rounded-lg border-l-4 border-gray-300 bg-gray-50/80 px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800/50">
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {parentReply.author_display_name}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
        {parentReply.body}
      </p>
    </div>
  );
}

function ReplyBubble({
  body,
  parentReply,
  authorDisplayName,
  authorRole,
  createdAt,
  editedAt,
  isOwn,
  onReply,
}: {
  body: string;
  parentReply: InquiryReplyResponse | null | undefined;
  authorDisplayName: string;
  authorRole: string;
  createdAt: string;
  editedAt: string | null | undefined;
  isOwn: boolean;
  onReply?: (() => void) | null;
}) {
  const isAgent =
    authorRole === "agent" || authorRole === "agency_owner" || authorRole === "admin";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        {parentReply ? <ParentReplyBanner parentReply={parentReply} /> : null}
        <div
          className={`rounded-2xl px-4 py-3 ${
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
        {onReply ? (
          <button
            type="button"
            onClick={onReply}
            className="mt-1 rounded px-2 py-0.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            Reply
          </button>
        ) : null}
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
  currentUserId,
}: {
  inquiryId: number;
  currentUserId?: number | null;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [parentReplyId, setParentReplyId] = useState<number | null>(null);
  const { data: replies, isLoading, isError } = useReplies(inquiryId);
  const replyToInquiry = useReplyToInquiry();

  const parentReply = useMemo(() => {
    if (parentReplyId === null || !replies) return null;
    return replies.find((r) => r.reply_id === parentReplyId) ?? null;
  }, [parentReplyId, replies]);

  const handleSendReply = useCallback(async () => {
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    try {
      await replyToInquiry.mutateAsync({
        inquiryId,
        body: trimmed,
        parentReplyId,
      });
      setReplyBody("");
      setParentReplyId(null);
    } catch {
      // Error handled by the mutation
    }
  }, [replyBody, replyToInquiry, inquiryId, parentReplyId]);

  const handleReplyTo = useCallback((replyId: number) => {
    setParentReplyId((prev) => (prev === replyId ? null : replyId));
  }, []);

  const handleCancelParentReply = useCallback(() => {
    setParentReplyId(null);
  }, []);

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
              parentReply={reply.parent_reply}
              authorDisplayName={reply.author_display_name}
              authorRole={reply.author_role}
              createdAt={reply.created_at}
              editedAt={reply.edited_at}
              isOwn={
                typeof currentUserId === "number" &&
                reply.author_id === currentUserId
              }
              onReply={() => handleReplyTo(reply.reply_id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          No replies yet
        </p>
      )}

      <div className="space-y-3 pt-2">
        {parentReply ? (
          <QuotedPreview reply={parentReply} onClear={handleCancelParentReply} />
        ) : null}
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
    </div>
  );
}
