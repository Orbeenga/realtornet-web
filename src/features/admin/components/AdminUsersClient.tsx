"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Skeleton,
} from "@/components";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminUsersCounts,
  useAdminUsersFiltered,
  useActivateAdminUser,
  useDeactivateAdminUser,
} from "@/features/admin/hooks/useAdminUsers";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import { notify } from "@/lib/toast";
import type { UserProfile } from "@/types";

type UsersTab = "all" | "seekers" | "agents" | "agency_owners" | "inactive" | "deactivated";

interface TabConfig {
  value: UsersTab;
  label: string;
  role?: string;
  activityState?: string;
}

const TABS: TabConfig[] = [
  { value: "all", label: "All" },
  { value: "seekers", label: "Seekers", role: "seeker" },
  { value: "agents", label: "Agents", role: "agent" },
  { value: "agency_owners", label: "Agency Owners", role: "agency_owner" },
  { value: "inactive", label: "Inactive", activityState: "inactive" },
  { value: "deactivated", label: "Deactivated", activityState: "deactivated" },
];

function getRoleBadgeVariant(role: UserProfile["user_role"]) {
  if (role === "admin") return "danger";
  if (role === "agent") return "default";
  if (role === "agency_owner") return "warning";
  return "outline";
}

function formatRoleLabel(role: UserProfile["user_role"]) {
  if (role === "agent") return "Agent";
  if (role === "agency_owner") return "Agency Owner";
  if (role === "admin") return "Admin";
  return "Seeker";
}

function getActivityState(user: UserProfile): { label: string; variant: "success" | "warning" | "outline" } {
  if (!user.is_active || user.deleted_at) {
    return { label: "Deactivated", variant: "outline" };
  }

  const daysThreshold = 90;
  const now = Date.now();

  if (user.last_login) {
    const lastLogin = new Date(user.last_login).getTime();
    const daysSince = (now - lastLogin) / (1000 * 60 * 60 * 24);
    if (daysSince <= daysThreshold) return { label: "Active", variant: "success" };
    return { label: "Inactive", variant: "warning" };
  }

  if (user.created_at) {
    const createdAt = new Date(user.created_at).getTime();
    const daysSince = (now - createdAt) / (1000 * 60 * 60 * 24);
    if (daysSince <= daysThreshold) return { label: "Active", variant: "success" };
    return { label: "Inactive", variant: "warning" };
  }

  return { label: "Active", variant: "success" };
}

function formatLastLogin(lastLogin: string | null | undefined): string {
  if (!lastLogin) return "Never";
  const date = new Date(lastLogin).getTime();
  const now = Date.now();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function extractApiDetail(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
    ? error.detail
    : null;
}

function UsersListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function UsersHeader() {
  return (
    <div className="space-y-3">
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to properties
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          User management
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage platform users: view activity states, deactivate accounts, and track last login dates.
        </p>
      </div>
    </div>
  );
}

export function AdminUsersClient() {
  const gate = useAdminRoleGate();
  const [activeTab, setActiveTab] = useState<UsersTab>("all");
  const [deactivateTarget, setDeactivateTarget] = useState<UserProfile | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<UserProfile | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");

  const countsQuery = useAdminUsersCounts();
  const activeTabConfig = TABS.find((t) => t.value === activeTab)!;
  const usersQuery = useAdminUsersFiltered(activeTabConfig.role, activeTabConfig.activityState);
  const deactivateUser = useDeactivateAdminUser();
  const activateUser = useActivateAdminUser();

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    const reason = deactivationReason.trim();
    if (!reason) {
      notify.error("Enter a reason before deactivating this user.");
      return;
    }
    try {
      await deactivateUser.mutateAsync({
        userId: deactivateTarget.user_id,
        payload: { reason },
      });
      notify.success("User deactivated");
      setDeactivateTarget(null);
      setDeactivationReason("");
    } catch (error) {
      notify.error(extractApiDetail(error) ?? "Could not deactivate user");
    }
  }, [deactivateTarget, deactivationReason, deactivateUser]);

  const handleReactivate = useCallback(async () => {
    if (!reactivateTarget) return;
    try {
      await activateUser.mutateAsync(reactivateTarget.user_id);
      notify.success("User reactivated");
      setReactivateTarget(null);
    } catch (error) {
      notify.error(extractApiDetail(error) ?? "Could not reactivate user");
    }
  }, [reactivateTarget, activateUser]);

  const counts = countsQuery.data;
  const countsMap = useMemo<Record<UsersTab, number>>(() => {
    if (!counts) return { all: 0, seekers: 0, agents: 0, agency_owners: 0, inactive: 0, deactivated: 0 };
    return {
      all: counts.all,
      seekers: counts.seekers,
      agents: counts.agents,
      agency_owners: counts.agency_owners,
      inactive: counts.inactive,
      deactivated: counts.deactivated,
    };
  }, [counts]);

  if (gate.isChecking) {
    return <LoadingState fullPage message="Checking admin access..." />;
  }

  if (!gate.isAllowed) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <UsersHeader />

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {TABS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={activeTab === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(value)}
          >
            {label}
            {countsMap[value] !== undefined ? ` (${countsMap[value]})` : null}
          </Button>
        ))}
      </div>

      {usersQuery.isLoading ? (
        <UsersListSkeleton />
      ) : usersQuery.isError ? (
        <ErrorState
          title="Could not load users"
          message="There was a problem loading the admin user directory. Please try again."
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (usersQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="No users found"
          description="No users match the selected filter."
        />
      ) : (
        <div className="space-y-4">
          {(usersQuery.data ?? []).map((user) => {
            const activityState = getActivityState(user);
            const isPendingDeactivate =
              deactivateUser.isPending && deactivateUser.variables?.userId === user.user_id;
            const isPendingActivate =
              activateUser.isPending && activateUser.variables === user.user_id;

            return (
              <div
                key={user.user_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                        {user.first_name} {user.last_name}
                      </h2>
                      <Badge variant={getRoleBadgeVariant(user.user_role)}>
                        {formatRoleLabel(user.user_role)}
                      </Badge>
                      <Badge variant={activityState.variant}>
                        {activityState.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Last login: {formatLastLogin(user.last_login)}
                    </p>
                    {user.deactivation_reason ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Deactivation reason: {user.deactivation_reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {user.user_role === "agent" ? (
                      <Link
                        href="/account/join-requests"
                        className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        View agency membership
                      </Link>
                    ) : null}
                    {user.user_role === "agency_owner" && user.agency_id ? (
                      <Link
                        href={`/agencies/${user.agency_id}`}
                        className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        View agency
                      </Link>
                    ) : null}
                    {user.user_role !== "admin" ? (
                      user.is_active && !user.deleted_at ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          loading={isPendingDeactivate}
                          onClick={() => {
                            setDeactivateTarget(user);
                            setDeactivationReason("");
                          }}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          loading={isPendingActivate}
                          onClick={() => setReactivateTarget(user)}
                        >
                          Reactivate
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeactivateTarget(null);
            setDeactivationReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate user</DialogTitle>
            <DialogDescription>
              This will immediately block API access for{" "}
              <strong>
                {deactivateTarget?.first_name} {deactivateTarget?.last_name}
              </strong>
              . They will receive 403 on all authenticated endpoints until reactivated.
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Reason for deactivation"
            placeholder="Required — this is recorded in the audit trail"
            value={deactivationReason}
            onChange={(e) => setDeactivationReason(e.target.value)}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              loading={deactivateUser.isPending}
              onClick={() => void handleDeactivate()}
            >
              Confirm deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reactivateTarget)}
        onOpenChange={(open: boolean) => {
          if (!open) setReactivateTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate user</DialogTitle>
            <DialogDescription>
              Restore API access for{" "}
              <strong>
                {reactivateTarget?.first_name} {reactivateTarget?.last_name}
              </strong>
              ? They will be able to log in and use the platform again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Cancel
            </DialogClose>
            <Button
              loading={activateUser.isPending}
              onClick={() => void handleReactivate()}
            >
              Confirm reactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
