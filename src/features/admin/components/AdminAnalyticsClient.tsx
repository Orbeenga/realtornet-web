"use client";

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

function formatNumber(value?: number | string | null) {
  if (value == null) {
    return "0";
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? String(value) : numericValue.toLocaleString();
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value?: number | string | null;
  detail?: string;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {formatNumber(value)}
        </p>
        {detail ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail}</p>
        ) : null}
      </CardBody>
    </Card>
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
    <div className="rounded-lg border border-border p-4">
      <p className="font-medium text-gray-900 dark:text-white">{label}</p>
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

function InlineMetric({ label, value }: { label: string; value?: number | string | null }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

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

  if (gate.isChecking) {
    return <LoadingState fullPage message="Checking admin access..." />;
  }

  if (!gate.isAllowed) {
    return null;
  }

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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin analytics
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Live platform metrics from the backend analytics contracts.
        </p>
      </div>

      {systemStatsQuery.isError ? (
        <ErrorState
          title="Could not load system stats"
          message="There was a problem loading the admin analytics summary."
          onRetry={() => {
            void systemStatsQuery.refetch();
          }}
        />
      ) : null}

      {systemStatsQuery.isLoading ? <LoadingState /> : null}

      {systemStats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Users" value={systemStats.users.total} />
          <MetricCard label="Properties" value={systemStats.properties.total} />
          <MetricCard label="Inquiries" value={systemStats.inquiries.total} />
          <MetricCard
            label="Verified listings"
            value={systemStats.properties.verified}
            detail={`${formatNumber(systemStats.properties.featured)} featured`}
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active property feed"
          value={activePropertiesQuery.isError ? "Unavailable" : activeProperties.length}
          detail="From /analytics/properties/active"
        />
        <MetricCard
          label="Featured property feed"
          value={featuredPropertiesQuery.isError ? "Unavailable" : featuredProperties.length}
          detail="From /analytics/properties/featured"
        />
        <MetricCard
          label="Admin overview"
          value={overview ? Object.keys(overview).length : overviewQuery.isError ? "Unavailable" : "Loaded"}
          detail={overview ? "Distinct overview payload available" : "No distinct fields returned"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Usage
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Activity windows returned by `/analytics/system/usage`.
              </p>
            </div>
            {usageQuery.isLoading ? <LoadingState /> : null}
            {usageQuery.isError ? (
              <ErrorState
                title="Could not load usage metrics"
                message="The usage analytics endpoint did not respond successfully."
                onRetry={() => {
                  void usageQuery.refetch();
                }}
              />
            ) : null}
            {usage ? (
              <div className="grid gap-4 md:grid-cols-2">
                <UsageMetric label="User logins" values={usage.user_logins} />
                <UsageMetric label="New users" values={usage.new_users} />
                <UsageMetric label="New properties" values={usage.new_properties} />
                <UsageMetric label="New inquiries" values={usage.new_inquiries} />
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Data integrity
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Backend health score and high-severity issue count.
              </p>
            </div>
            {integrityQuery.isLoading ? <LoadingState /> : null}
            {integrity ? (
              <div className="space-y-4">
                <InlineMetric label="Health score" value={integrity.health_score} />
                <InlineMetric label="Total issues" value={integrity.total_issues} />
                <InlineMetric label="High severity" value={integrity.high_severity_count} />
                {integrity.issues?.slice(0, 5).map((issue) => (
                  <div key={`${issue.category}-${issue.issue_type}`} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {issue.issue_type}
                      </p>
                      <Badge variant={issue.severity === "high" ? "danger" : "warning"}>
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
                onRetry={() => {
                  void integrityQuery.refetch();
                }}
              />
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Agent performance
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Listing, sales, and rating metrics from the analytics contract.
            </p>
          </div>
          {agentPerformanceQuery.isLoading ? <LoadingState /> : null}
          {agentPerformanceQuery.isError ? (
            <ErrorState
              title="Could not load agent performance"
              message="The agent performance endpoint did not respond successfully."
              onRetry={() => {
                void agentPerformanceQuery.refetch();
              }}
            />
          ) : null}
          {!agentPerformanceQuery.isLoading && !agentPerformanceQuery.isError && agents.length === 0 ? (
            <EmptyState
              title="No agent performance records"
              description="Agent analytics will appear here after listing activity accumulates."
            />
          ) : null}
          {agents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Agent</th>
                    <th className="py-3 pr-4">Agency</th>
                    <th className="py-3 pr-4">Listings</th>
                    <th className="py-3 pr-4">Active</th>
                    <th className="py-3 pr-4">Sold</th>
                    <th className="py-3 pr-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agents.slice(0, 20).map((agent) => (
                    <tr key={agent.user_id}>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                        {agent.agent_name}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {agent.agency_name ?? "Independent"}
                      </td>
                      <td className="py-3 pr-4">{agent.total_listings}</td>
                      <td className="py-3 pr-4">{agent.active_listings}</td>
                      <td className="py-3 pr-4">{agent.sold_count}</td>
                      <td className="py-3 pr-4">
                        {agent.avg_rating ?? "No reviews"} ({agent.review_count})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Top agents
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ranked agent performance from `/analytics/agents/top`.
            </p>
          </div>
          {topAgentsQuery.isLoading ? <LoadingState /> : null}
          {topAgentsQuery.isError ? (
            <ErrorState
              title="Could not load top agents"
              message="The top agents endpoint did not respond successfully."
              onRetry={() => {
                void topAgentsQuery.refetch();
              }}
            />
          ) : null}
          {!topAgentsQuery.isLoading && !topAgentsQuery.isError && topAgents.length === 0 ? (
            <EmptyState
              title="No top agents yet"
              description="Top-agent rankings will appear after listing and review activity accumulates."
            />
          ) : null}
          {topAgents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Agent</th>
                    <th className="py-3 pr-4">Agency</th>
                    <th className="py-3 pr-4">Listings</th>
                    <th className="py-3 pr-4">Sold</th>
                    <th className="py-3 pr-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topAgents.map((agent) => (
                    <tr key={agent.user_id}>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                        {agent.agent_name}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {agent.agency_name ?? "Independent"}
                      </td>
                      <td className="py-3 pr-4">{agent.total_listings}</td>
                      <td className="py-3 pr-4">{agent.sold_count}</td>
                      <td className="py-3 pr-4">
                        {agent.avg_rating ?? "No reviews"} ({agent.review_count})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
