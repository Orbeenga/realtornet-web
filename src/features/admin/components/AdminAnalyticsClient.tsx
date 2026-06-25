"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  Users,
  XCircle,
} from "lucide-react";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/components";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import {
  useAdminDataIntegrity,
  useAdminSystemStats,
} from "@/features/admin/hooks/useAdminAnalytics";
import { useAdminAudit } from "@/features/admin/hooks/useAdminAudit";
import { moderationStatusLabel } from "@/features/properties/lib/moderation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIT_PAGE_SIZE = 20;

const LISTING_STATE_ORDER = [
  "draft",
  "agency_review",
  "agency_rejected",
  "admin_review",
  "admin_rejected",
  "live",
  "revoked",
] as const;

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

const CLICKABLE_CARD_CLASS =
  "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value?: number | string | null) {
  if (value == null) return "0";
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? String(value) : numericValue.toLocaleString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single clickable metric card matching agent stats pattern. */
function MetricCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value?: number | string | null;
  icon?: typeof Building2;
  href?: string;
}) {
  const inner = (
    <div className="flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
          <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
      )}
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(value)}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block ${CLICKABLE_CARD_CLASS}`}
        aria-label={`Open ${label} drilldown`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={CLICKABLE_CARD_CLASS}>{inner}</div>;
}

/** Inline metric chip used for listing-state breakdown matching agent stats pattern. */
function InlineMetric({
  label,
  value,
  status,
}: {
  label: string;
  value?: number | string | null;
  status?: string;
}) {
  const meta = status
    ? MODERATION_STATUS_META[status] ?? {
        icon: List,
        color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
        label: status.replace(/_/g, " "),
      }
    : {
        icon: List,
        color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
        label,
      };
  const Icon = meta.icon;

  return (
    <Link
      href={`/account/admin/properties?status=${encodeURIComponent(status ?? "")}`}
      className={`flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${CLICKABLE_CARD_CLASS}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatNumber(value)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminAnalyticsClient() {
  const gate = useAdminRoleGate();
  const systemStatsQuery = useAdminSystemStats(gate.isAllowed);
  const integrityQuery = useAdminDataIntegrity(gate.isAllowed);
  const auditQuery = useAdminAudit(gate.isAllowed);

  // Audit pagination
  const [auditPage, setAuditPage] = useState(1);
  const audit = auditQuery.data ?? null;
  const auditTotalPages = audit
    ? Math.max(1, Math.ceil(audit.recent_changes.length / AUDIT_PAGE_SIZE))
    : 1;
  const auditPageChanges = useMemo(() => {
    if (!audit) return [];
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return audit.recent_changes.slice(start, start + AUDIT_PAGE_SIZE);
  }, [audit, auditPage]);

  // ---- Gate guards ----
  if (gate.isChecking) {
    return <LoadingState fullPage message="Checking admin access..." />;
  }
  if (!gate.isAllowed) {
    return null;
  }

  // ---- Derived data ----
  const systemStats = systemStatsQuery.data;
  const integrity = integrityQuery.data;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Live platform metrics from the backend analytics contracts.
        </p>
      </div>

      {/* ---- Error / Loading states ---- */}
      {systemStatsQuery.isError && (
        <ErrorState
          title="Could not load system stats"
          message="There was a problem loading the admin analytics summary."
          onRetry={() => void systemStatsQuery.refetch()}
        />
      )}

      {systemStatsQuery.isLoading && <LoadingState />}

      {/* ---- Metric Cards (top row) ---- */}
      {systemStats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Users"
            value={systemStats.users.total}
            icon={Users}
            href="/account/users"
          />
          <MetricCard
            label="Properties"
            value={systemStats.properties.total}
            icon={Building2}
            href="/account/admin/properties"
          />
          <MetricCard
            label="Inquiries"
            value={systemStats.inquiries.total}
            icon={Inbox}
            href="/account/inquiries"
          />
          <MetricCard
            label="Verified listings"
            value={systemStats.properties.verified}
            icon={BarChart}
            href="/account/admin/properties?filter=verified"
          />
        </section>
      )}

      {/* ---- Listing state breakdown ---- */}
      {systemStats?.properties?.by_status && (
        <section>
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Listings by status
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {LISTING_STATE_ORDER.map((state) => (
              <InlineMetric
                key={state}
                label={moderationStatusLabel[state] ?? state.replace(/_/g, " ")}
                value={systemStats.properties.by_status?.[state] ?? 0}
                status={state}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---- Health Score Card ---- */}
      {integrity && (
        <section>
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            System health
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {integrity.health_score ?? "—"}
                </p>
                <p className="text-sm font-medium text-gray-500">Health score</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(integrity.high_severity_count)}
                </p>
                <p className="text-sm font-medium text-gray-500">High severity</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(integrity.total_issues)}
                </p>
                <p className="text-sm font-medium text-gray-500">Total issues</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---- Audit activity ---- */}
      <section>
        <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
          Audit activity
        </h2>
        {auditQuery.isLoading ? <LoadingState /> : null}
        {auditQuery.isError ? (
          <ErrorState
            title="Could not load audit activity"
            message="The admin audit endpoint did not respond successfully."
            onRetry={() => void auditQuery.refetch()}
          />
        ) : null}
        {audit ? (
          <div className="space-y-4">
            {/* Summary counters */}
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Creations (30d)"
                value={audit.creation_count_30d}
                icon={Activity}
              />
              <MetricCard
                label="Deletions (30d)"
                value={audit.deletion_count_30d}
                icon={XCircle}
              />
            </div>

            {/* Table view */}
            {audit.recent_changes.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {auditPageChanges.map((change) => {
                      let action: string;
                      let timestamp: string | null | undefined;
                      if (change.deleted_at) {
                        action = "delete";
                        timestamp = change.deleted_at;
                      } else if (change.created_at) {
                        action = "create";
                        timestamp = change.created_at;
                      } else if (change.updated_at) {
                        action = "update";
                        timestamp = change.updated_at;
                      } else {
                        action = "unknown";
                        timestamp = null;
                      }
                      return (
                        <tr
                          key={`${change.table_name}-${change.record_id}`}
                          className="h-14 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-3 align-middle font-medium text-gray-900 dark:text-white">
                            {change.table_name} #{change.record_id}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <Badge
                              variant={
                                action === "delete"
                                  ? "danger"
                                  : action === "create"
                                    ? "success"
                                    : "warning"
                              }
                            >
                              {action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-middle text-gray-600 dark:text-gray-300">
                            {timestamp ? new Date(timestamp).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 align-middle text-gray-600 dark:text-gray-300">
                            {change.actor_name}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No recent changes"
                description="Audit activity will appear here after data changes occur."
              />
            )}

            {/* Pagination controls */}
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page {auditPage} of {auditTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
