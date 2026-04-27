"use client";

import Link from "next/link";
import { Badge, Card, CardBody } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { normalizeAppRole } from "@/features/auth/navigation";
import { getStoredJwtRole } from "@/lib/jwt";
import type { Agency } from "@/types";

interface AgencyProfileHeaderProps {
  agency: Agency;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AgencyProfileHeader({ agency }: AgencyProfileHeaderProps) {
  const initials = getInitials(agency.name);
  const { user, loading } = useAuth();
  const role = normalizeAppRole(getStoredJwtRole() ?? user?.user_role);
  const canRequestToJoin = !loading && (role === "seeker" || role === "agent");

  return (
    <Card>
      <CardBody className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-2xl font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          {agency.logo_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agency.logo_url}
                alt={agency.name}
                className="h-full w-full object-cover"
              />
            </>
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {agency.name}
              </h1>
              {agency.is_verified ? <Badge>Verified</Badge> : null}
            </div>
            {canRequestToJoin ? (
              <Link
                href={`/agencies/${agency.agency_id}/join`}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Request to Join as Agent
              </Link>
            ) : null}
          </div>

          {agency.description ? (
            <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              {agency.description}
            </p>
          ) : null}

          <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
            {agency.email ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {agency.email}
                </p>
              </div>
            ) : null}
            {agency.phone_number ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Phone
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {agency.phone_number}
                </p>
              </div>
            ) : null}
            {agency.address ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Address
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {agency.address}
                </p>
              </div>
            ) : null}
            {agency.website_url ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Website
                </p>
                <a
                  href={agency.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Visit website
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
