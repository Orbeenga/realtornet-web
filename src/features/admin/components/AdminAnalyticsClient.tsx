"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import {
  useAdminActiveProperties,
  useAdminAgentPerformance,
  useAdminDataIntegrity,
  useAdminFeaturedProperties,
  useAdminStatsOverview,
  useAdminSystemStats,
  useAdminTopAgents,
  useAdminUsageMetrics,
} from "@/features/admin/hooks/useAdminAnalytics";
import { useAdminAudit } from "@/features/admin/hooks/useAdminAudit";
import { moderationStatusLabel } from "@/features/properties/lib/moderation";
import type { AuditRecentChange } from "@/types";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value?: number | string | null) {
  if (value == null) return "0";
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? String(value) : numericValue.toLocaleString();
}

function healthBadgeVariant(score?: number | null): "success" | "warning" | "danger" {
  if (score == null) return "warning";
  if (score >= 95) return "success";
  if (score >= 80) return "warning";
  return "danger";
}

function severityBadgeVariant(severity: string): "danger" | "warning" | "default" {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "default";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single clickable metric card with hover state and optional drill-down link. */
function MetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value?: number | string | null;
  detail?: string;
  href?: string;
}) {
  const inner = (
    <Card hoverable={!!href}>
      <CardBody>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="mt-2 text-[32px] font-bold leading-tight text-gray-900 dark:text-white">
          {formatNumber(value)}
        </p>
        {detail ? (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{detail}</p>
        ) : null}
      </CardBody>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80">
        {inner}
      </Link>
    );
  }

  return inner;
}

/** Inline metric chip used for listing-state breakdown. */
function InlineMetric({ label, value }: { label: string; value?: number | string | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function UsageMetric({
  label,
  values,
}: {
  label: string;
  values?: {
    last_24_hours: number;
    last_7_days: number;
    last_30_days: number;
  };
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">24h</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(values?.last_24_hours)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">7d</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(values?.last_7_days)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">30d</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(values?.last_30_days)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Section header with 18px semibold typography. */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

/** Audit timeline view for recent changes. */
function AuditTimeline({ changes }: { changes: AuditRecentChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="relative ml-3 border-l-2 border-gray-200 pl-6 dark:border-gray-700">
      {changes.map((change) => {
        const action = change.deleted_at
          ? "delete"
          : change.created_at
            ? "create"
            : change.updated_at
              ? "update"
              : "unknown";
        const timestamp =
          change.deleted_at ?? change.created_at ?? change.updated_at;
        const variant =
          action === "delete" ? "danger" : action === "create" ? "success" : "warning";

        return (
          <div key={`${change.table_name}-${change.record_id}`} className="relative pb-5 last:pb-0">
            {/* Dot on timeline */}
            <span
              className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
                action === "delete"
                  ? "bg-red-500"
                  : action === "create"
                    ? "bg-green-500"
                    : "bg-amber-500"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-gray-900 dark:text-white">
                {change.table_name} #{change.record_id}
              </span>
              <Badge variant={variant}>{action}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {timestamp ? (
                <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time>
              ) : (
                <span>—</span>
              )}
              <span aria-hidden="true">·</span>
              <span>{change.actor_name ?? "System"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminAnalyticsClient() {
  const gate = useAdminRoleGate();
  const systemStatsQuery = useAdminSystemStats(gate.isAllowed);
  const usageQuery = useAdminUsageMetrics(gate.isAllowed);
  const integrityQuery = useAdminDataIntegrity(gate.isAllowed);
  const agentPerformanceQuery = useAdminAgentPerformance(gate.isAllowed);
  const topAgentsQuery = useAdminTopAgents(gate.isAllowed);
  const activePropertiesQuery = useAdminActiveProperties(gate.isAllowed);
  const featuredPropertiesQuery = useAdminFeaturedProperties(gate.isAllowed);
  const overviewQuery = useAdminStatsOverview(gate.isAllowed);
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
  const usage = usageQuery.data;
  const integrity = integrityQuery.data;
  const agents = agentPerformanceQuery.data ?? [];
  const topAgents = topAgentsQuery.data ?? [];
  const activeProperties = activePropertiesQuery.data ?? [];
  const featuredProperties = featuredPropertiesQuery.data ?? [];
  const overview =
    overviewQuery.data && Object.keys(overviewQuery.data).length > 0
      ? overviewQuery.data
      : null;

  // Collapse empty-agent-reviews logic: if ALL agents have 0 reviews, show collapsed message
  const allAgentsHaveNoReviews = agents.length > 0 && agents.every((a) => a.review_count === 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 bg-gray-50 px-6 py-8 dark:bg-gray-950">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin analytics
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Users"
            value={systemStats.users.total}
            href="/account/users"
          />
          <MetricCard
            label="Properties"
            value={systemStats.properties.total}
            href="/account/admin/properties"
          />
          <MetricCard
            label="Inquiries"
            value={systemStats.inquiries.total}
            detail="Across all properties"
          />
          <MetricCard
            label="Verified listings"
            value={systemStats.properties.verified}
            detail={`${formatNumber(systemStats.properties.featured)} featured`}
            href="/account/admin/properties"
          />
        </div>
      )}

      {/* ---- Listing state breakdown ---- */}
      {systemStats?.properties?.by_status && (
        <section>
          <SectionHeader title="Listing state breakdown" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LISTING_STATE_ORDER.map((state) => (
              <InlineMetric
                key={state}
                label={moderationStatusLabel[state] ?? state.replace(/_/g, " ")}
                value={systemStats.properties.by_status?.[state] ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---- Secondary metric badges ---- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active property feed"
          value={activePropertiesQuery.isError ? "Unavailable" : activeProperties.length}
          detail="From /analytics/properties/active"
        />
        <MetricCard
          label="Featured property feed"
          value={featuredProperties.length}
          detail={
            featuredPropertiesQuery.isError
              ? "Endpoint error"
              : featuredProperties.length === 0
                ? "No featured properties"
                : "From /analytics/properties/featured"
          }
        />
        <MetricCard
          label="Admin overview"
          value={overview ? Object.keys(overview).length : overviewQuery.isError ? "Unavailable" : "Loaded"}
          detail={overview ? "Distinct overview payload" : "No distinct fields"}
        />
      </div>

      {/* ---- Usage + Integrity panel ---- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Usage */}
        <Card>
          <CardBody className="space-y-4">
            <SectionHeader
              title="Usage"
              subtitle="Activity windows from /analytics/system/usage."
            />
            {usageQuery.isLoading ? <LoadingState /> : null}
            {usageQuery.isError ? (
              <ErrorState
                title="Could not load usage metrics"
                message="The usage analytics endpoint did not respond successfully."
                onRetry={() => void usageQuery.refetch()}
              />
            ) : null}
            {usage ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <UsageMetric label="User logins" values={usage.user_logins} />
                <UsageMetric label="New users" values={usage.new_users} />
                <UsageMetric label="New properties" values={usage.new_properties} />
                <UsageMetric label="New inquiries" values={usage.new_inquiries} />
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Integrity */}
        <Card>
          <CardBody className="space-y-4">
            <SectionHeader
              title="Data integrity"
              subtitle="Backend health score and high-severity issue count."
            />
            {integrityQuery.isLoading ? <LoadingState /> : null}
            {integrity ? (
              <div className="space-y-4">
                {/* Health score with colored badge */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Health score
                  </span>
                  <Badge variant={healthBadgeVariant(integrity.health_score)}>
                    {integrity.health_score ?? "—"}
                  </Badge>
                </div>

                {/* High severity count */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    High severity
                  </span>
                  <Badge
                    variant={integrity.high_severity_count > 0 ? "danger" : "success"}
                  >
                    {formatNumber(integrity.high_severity_count)}
                  </Badge>
                </div>

                {/* Total issues */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total issues
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(integrity.total_issues)}
                  </span>
                </div>

                {/* Issue list */}
                {integrity.issues?.slice(0, 5).map((issue) => (
                  <div
                    key={`${issue.category}-${issue.issue_type}`}
                    className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {issue.issue_type}
                      </p>
                      <Badge variant={severityBadgeVariant(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      {issue.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : integrityQuery.isError ? (
              <ErrorState
                title="Could not load integrity metrics"
                message="The integrity analytics endpoint did not respond successfully."
                onRetry={() => void integrityQuery.refetch()}
              />
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* ---- Agent performance ---- */}
      <Card>
        <CardBody className="space-y-4">
          <SectionHeader
            title="Agent performance"
            subtitle="Listing, sales, and rating metrics from the analytics contract."
          />
          {agentPerformanceQuery.isLoading ? <LoadingState /> : null}
          {agentPerformanceQuery.isError ? (
            <ErrorState
              title="Could not load agent performance"
              message="The agent performance endpoint did not respond successfully."
              onRetry={() => void agentPerformanceQuery.refetch()}
            />
          ) : null}
          {!agentPerformanceQuery.isLoading &&
          !agentPerformanceQuery.isError &&
          agents.length === 0 ? (
            <EmptyState
              title="No agent performance records"
              description="Agent analytics will appear here after listing activity accumulates."
            />
          ) : null}
          {agents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Agent</th>
                    <th className="py-3 pr-4">Agency</th>
                    <th className="py-3 pr-4">Listings</th>
                    <th className="py-3 pr-4">Active</th>
                    <th className="py-3 pr-4">Sold</th>
                    <th className="py-3 pr-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {agents.slice(0, 20).map((agent) => (
                    <tr
                      key={agent.user_id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                        <Link
                          href={`/agents/${agent.user_id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {agent.agent_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {agent.agency_name ?? "Independent"}
                      </td>
                      <td className="py-3 pr-4">{agent.total_listings}</td>
                      <td className="py-3 pr-4">{agent.active_listings}</td>
                      <td className="py-3 pr-4">{agent.sold_count}</td>
                      <td className="py-3 pr-4">
                        {allAgentsHaveNoReviews ? (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        ) : agent.avg_rating != null ? (
                          <span>
                            {Number(agent.avg_rating).toFixed(1)} ({agent.review_count})
                          </span>
                        ) : (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            No reviews ({agent.review_count})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allAgentsHaveNoReviews && (
                <p className="mt-3 text-sm italic text-gray-400 dark:text-gray-500">
                  No reviews available across {agents.length} agent{agents.length !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* ---- Top agents ---- */}
      <Card>
        <CardBody className="space-y-4">
          <SectionHeader
            title="Top agents"
            subtitle="Ranked agent performance from /analytics/agents/top."
          />
          {topAgentsQuery.isLoading ? <LoadingState /> : null}
          {topAgentsQuery.isError ? (
            <ErrorState
              title="Could not load top agents"
              message="The top agents endpoint did not respond successfully."
              onRetry={() => void topAgentsQuery.refetch()}
            />
          ) : null}
          {!topAgentsQuery.isLoading &&
          !topAgentsQuery.isError &&
          topAgents.length === 0 ? (
            <EmptyState
              title="No top agents yet"
              description="Top-agent rankings will appear after listing and review activity accumulates."
            />
          ) : null}
          {topAgents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Agent</th>
                    <th className="py-3 pr-4">Agency</th>
                    <th className="py-3 pr-4">Listings</th>
                    <th className="py-3 pr-4">Sold</th>
                    <th className="py-3 pr-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {topAgents.map((agent) => (
                    <tr
                      key={agent.user_id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                        <Link
                          href={`/agents/${agent.user_id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {agent.agent_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {agent.agency_name ?? "Independent"}
                      </td>
                      <td className="py-3 pr-4">{agent.total_listings}</td>
                      <td className="py-3 pr-4">{agent.sold_count}</td>
                      <td className="py-3 pr-4">
                        {agent.avg_rating != null ? (
                          <span>
                            {Number(agent.avg_rating).toFixed(1)} ({agent.review_count})
                          </span>
                        ) : (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            No reviews ({agent.review_count})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* ---- Audit activity ---- */}
      <Card>
        <CardBody className="space-y-4">
          <SectionHeader
            title="Audit activity"
            subtitle="Creation and deletion counts (last 30 days) and recent changes from the audit trail."
          />
          {auditQuery.isLoading ? <LoadingState /> : null}
          {auditQuery.isError ? (
            <ErrorState
              title="Could not load audit activity"
              message="The admin audit endpoint did not respond successfully."
              onRetry={() => void auditQuery.refetch()}
            />
          ) : null}
          {audit ? (
            <div className="space-y-6">
              {/* Summary counters */}
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Creations (30d)" value={audit.creation_count_30d} />
                <MetricCard label="Deletions (30d)" value={audit.deletion_count_30d} />
              </div>

              {/* Table view */}
              {audit.recent_changes.length > 0 ? (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        <tr>
                          <th className="py-3 pr-4">Entity</th>
                          <th className="py-3 pr-4">Action</th>
                          <th className="py-3 pr-4">Timestamp</th>
                          <th className="py-3 pr-4">Actor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
                              className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                                {change.table_name} #{change.record_id}
                              </td>
                              <td className="py-3 pr-4">
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
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                                {timestamp ? new Date(timestamp).toLocaleString() : "—"}
                              </td>
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                                {change.actor_name}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  {auditTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
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
              ) : (
                <EmptyState
                  title="No recent changes"
                  description="Audit activity will appear here after data changes occur."
                />
              )}

              {/* Timeline view (only show if there are changes) */}
              {audit.recent_changes.length > 0 && (
                <div>
                  <h3 className="mb-4 text-[18px] font-semibold text-gray-900 dark:text-white">
                    Recent timeline
                  </h3>
                  <AuditTimeline changes={audit.recent_changes.slice(0, 20)} />
                </div>
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}