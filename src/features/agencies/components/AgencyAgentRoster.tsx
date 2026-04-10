"use client";

import Link from "next/link";
import { Card, CardBody, EmptyState, Skeleton } from "@/components";
import type { Agent, UserProfile } from "@/types";

interface AgencyAgentRosterProps {
  agents?: Agent[];
  users?: Record<number, UserProfile | undefined>;
  isLoading?: boolean;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AgencyAgentRoster({
  agents = [],
  users = {},
  isLoading = false,
}: AgencyAgentRosterProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Our Agents
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Meet the agents currently affiliated with this agency.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!isLoading && agents.length === 0 ? (
        <EmptyState
          title="No agents listed for this agency"
          description="This agency does not have any public agent profiles yet."
        />
      ) : null}

      {!isLoading && agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const user = users[agent.user_id];
            const name =
              [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
              agent.company_name ||
              "Listing agent";

            return (
              <Link key={agent.profile_id} href={`/agents/${agent.profile_id}`} className="block">
                <Card hoverable className="h-full">
                  <CardBody className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {name}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {agent.specialization ?? "Real estate agent"}
                        </p>
                      </div>
                    </div>
                    {user?.email ? (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    ) : null}
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
