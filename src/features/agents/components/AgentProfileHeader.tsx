"use client";

import Link from "next/link";
import type { Agent, UserProfile } from "@/types";
import { Badge, Card, CardBody } from "@/components";

interface AgentProfileHeaderProps {
  agent: Agent;
  user?: UserProfile | null;
}

function getInitials(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const base =
    [firstName, lastName].filter(Boolean).join(" ").trim() || fallback?.trim() || "Agent";

  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AgentProfileHeader({ agent, user }: AgentProfileHeaderProps) {
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    agent.company_name ||
    "Listing agent";
  const initials = getInitials(user?.first_name, user?.last_name, fullName);

  return (
    <Card>
      <CardBody className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {initials}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {fullName}
              </h1>
              {user?.is_verified ? <Badge>Verified</Badge> : null}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {agent.specialization ?? "Real estate agent"}
            </p>
          </div>

          {agent.bio ? (
            <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              {agent.bio}
            </p>
          ) : null}

          <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
            {user?.email ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {user.email}
                </p>
              </div>
            ) : null}
            {user?.phone_number ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Phone
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {user.phone_number}
                </p>
              </div>
            ) : null}
            {agent.years_experience != null ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Experience
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {agent.years_experience} years
                </p>
              </div>
            ) : null}
            {agent.license_number ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  License
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {agent.license_number}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {agent.agency_id ? (
              <Link
                href={`/agencies/${agent.agency_id}`}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                View affiliated agency
              </Link>
            ) : null}
            {agent.website ? (
              <a
                href={agent.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Visit website
              </a>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
