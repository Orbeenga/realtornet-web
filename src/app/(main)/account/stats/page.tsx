"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Activity,
  AlertCircle,
  BarChart,
  Building2,
  Clock,
  Eye,
  FileText,
  Inbox,
  List,
  Mail,
  MessageCircle,
  Reply,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentPersonalStats } from "@/features/agents/hooks";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

const MODERATION_STATUS_META: Record<
  string,
  { icon: typeof FileText; color: string; label: string }
> = {
  draft: {
    icon: FileText,
    color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
    label: "Draft — not yet submitted",
  },
  agency_review: {
    icon: Clock,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    label: "Awaiting agency review",
  },
  agency_rejected: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    label: "Rejected at agency level",
  },
  admin_review: {
    icon: Eye,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
    label: "Awaiting admin decision",
  },
  admin_rejected: {
    icon: AlertCircle,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    label: "Rejected by admin",
  },
  live: {
    icon: BarChart,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    label: "Live and visible to public",
  },
  revoked: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    label: "Revoked from live",
  },
};

const MEMBERSHIP_STATUS_META: Record<
  string,
  { icon: typeof Users; color: string; label: string }
> = {
  active: {
    icon: Users,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    label: "Active membership",
  },
  inactive: {
    icon: Clock,
    color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
    label: "Inactive membership",
  },
  suspended: {
    icon: AlertCircle,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    label: "Suspended membership",
  },
  blocked: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    label: "Blocked membership",
  },
  left: {
    icon: XCircle,
    color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
    label: "Left membership",
  },
  revoked: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    label: "Revoked membership",
  },
};

export default function AgentStatsPage() {
  const { user } = useAuth();
  const { data: stats, isLoading, isError, refetch } = useAgentPersonalStats(Boolean(user));

  const pendingCount = useMemo(() => {
    if (!stats?.listings_by_status) return 0;
    return Object.entries(stats.listings_by_status)
      .filter(([s]) => s !== "live")
      .reduce((sum, [, c]) => sum + c, 0);
  }, [stats]);

  const totalListings = useMemo(() => {
    if (!stats?.listings_by_status) return 0;
    return Object.values(stats.listings_by_status).reduce((sum, c) => sum + c, 0);
  }, [stats]);

  const respondedRate = stats?.total_inquiries_received
    ? Math.round(
        ((stats.inquiries_responded ?? 0) / stats.total_inquiries_received) * 100,
      )
    : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-1">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to properties
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          My Stats
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your personal listing, inquiry, and membership performance.
        </p>
      </div>

      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState
          title="Could not load stats"
          message="There was a problem loading your statistics."
          onRetry={() => { void refetch(); }}
        />
      ) : null}
      {!isLoading && !isError && !stats ? (
        <EmptyState title="No stats available" description="" />
      ) : null}

      {stats ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalListings}</p>
                <p className="text-sm font-medium text-gray-500">Total listings</p>
              </div>
            </div>
            <div className="flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
                <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                <p className="text-sm font-medium text-gray-500">Pending actions</p>
              </div>
            </div>
            <div className="flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                <Inbox className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_inquiries_received}
                </p>
                <p className="text-sm font-medium text-gray-500">Inquiries received</p>
              </div>
            </div>
          </section>

          {stats.listings_by_status && Object.keys(stats.listings_by_status).length > 0 ? (
            <section>
              <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
                Listings by status
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Object.entries(stats.listings_by_status)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([status, count]) => {
                    const meta =
                      MODERATION_STATUS_META[status] ?? {
                        icon: List,
                        color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
                        label: status.replace(/_/g, " "),
                      };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            {status.replace(/_/g, " ")}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{meta.label}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Inquiry response rate
                </h2>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {respondedRate}%
                  <span className="ml-2 text-base font-medium text-gray-500">
                    ({stats.inquiries_responded} responded of {stats.total_inquiries_received})
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {stats.total_inquiries_received - stats.inquiries_responded} unresponded
                </span>
                <span className="flex items-center gap-1">
                  <Reply className="h-4 w-4" />
                  {stats.inquiries_responded} responded
                </span>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Agency memberships
                </h2>
              </div>
              {stats.membership_counts && Object.keys(stats.membership_counts).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(stats.membership_counts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([status, count]) => {
                      const meta =
                        MEMBERSHIP_STATUS_META[status] ?? {
                          icon: Users,
                          color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
                          label: status,
                        };
                      const Icon = meta.icon;
                      return (
                        <div
                          key={status}
                          className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.color}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-1 items-center justify-between">
                            <p className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                              {status}
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {count}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No agency memberships.</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
