import Link from "next/link";
import type { Agent } from "@/types";
import { Badge } from "@/components";

interface PropertyAgentPanelProps {
  agent?: Agent | null;
  ownerUserId: number;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PropertyAgentPanel({
  agent,
  ownerUserId,
}: PropertyAgentPanelProps) {
  const displayName = agent?.company_name ?? "Listing agent";
  const subtitle = agent?.specialization ?? "Property specialist";
  const initials = getInitials(displayName || "Agent");

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Agent information
      </h2>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {initials || "AG"}
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {displayName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        {agent?.years_experience != null ? (
          <div className="flex items-center justify-between gap-3">
            <span>Experience</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {agent.years_experience} years
            </span>
          </div>
        ) : null}
        {agent?.license_number ? (
          <div className="flex items-center justify-between gap-3">
            <span>License</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {agent.license_number}
            </span>
          </div>
        ) : null}
        {agent?.website ? (
          <div className="flex items-center justify-between gap-3">
            <span>Website</span>
            <a
              href={agent.website}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Visit site
            </a>
          </div>
        ) : null}
      </div>

      {agent?.bio ? (
        <div className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:bg-gray-950/60 dark:text-gray-300">
          {agent.bio}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {agent?.company_name ? <Badge variant="outline">{agent.company_name}</Badge> : null}
        {agent?.specialization ? <Badge>{agent.specialization}</Badge> : null}
      </div>

      <Link
        href={agent ? `/agents/${agent.profile_id}` : `/agents/${ownerUserId}`}
        className="inline-flex text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        View agent profile
      </Link>
    </section>
  );
}
