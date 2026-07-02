"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { useAdminUserMemberships } from "@/features/admin/hooks/useAdminUsers";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";

function getMembershipStatusVariant(status: string): "success" | "warning" | "danger" | "outline" | "default" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  if (status === "suspended" || status === "blocked") return "danger";
  if (status === "revoked" || status === "left") return "outline";
  return "default";
}

function formatMembershipStatus(status: string): string {
  if (status === "inactive") return "Revoked";
  return status;
}

function formatMembershipDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminUserMembershipsClient() {
  const gate = useAdminRoleGate();
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const { data: memberships, isLoading, isError, refetch } = useAdminUserMemberships(userId);

  if (gate.isChecking) {
    return <LoadingState fullPage message="Checking admin access..." />;
  }

  if (!gate.isAllowed) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <EmptyState title="Access denied" description="You need admin privileges to view this page." />
      </div>
    );
  }

  if (Number.isNaN(userId)) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <EmptyState title="Invalid user ID" description="The requested user ID is not valid." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="space-y-2">
        <Link
          href="/account/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to user management
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Agency memberships
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          User ID {userId} — all current and past agency affiliations.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          {isLoading ? (
            <LoadingState message="Loading memberships..." />
          ) : isError ? (
            <ErrorState
              title="Could not load memberships"
              message="There was a problem loading agency memberships for this user."
              onRetry={() => void refetch()}
            />
          ) : !memberships || memberships.length === 0 ? (
            <EmptyState
              title="No memberships"
              description="This user has no agency memberships on record."
            />
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => (
                <div
                  key={membership.membership_id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center dark:border-gray-800 dark:bg-gray-900/50"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/agencies/${membership.agency_id}`}
                      className="text-sm font-medium text-gray-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400"
                    >
                      {membership.agency_name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Joined {formatMembershipDate(membership.created_at)}
                    </p>
                    {membership.deleted_at ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Ended {formatMembershipDate(membership.deleted_at)}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={getMembershipStatusVariant(membership.status)}>
                    {formatMembershipStatus(membership.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
