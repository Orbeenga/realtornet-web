"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, EmptyState, ErrorState, Input, LoadingState, Skeleton } from "@/components";
import { useAgencies } from "@/features/agencies/hooks";
import {
  useAdminUsers,
  useAgentProfileForAdmin,
  useActivateAdminUser,
  useAssignAgentAgency,
  useDeactivateAdminUser,
  useUpdateAdminUserRole,
} from "@/features/admin/hooks/useAdminUsers";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import { notify } from "@/lib/toast";
import type { UserProfile } from "@/types";

function UsersListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function getRoleBadgeVariant(role: UserProfile["user_role"]) {
  if (role === "admin") {
    return "danger";
  }

  if (role === "agent" || role === "agency_owner") {
    return "success";
  }

  return "warning";
}

function formatRoleLabel(role: UserProfile["user_role"]) {
  if (role === "agent") {
    return "Agent";
  }

  if (role === "agency_owner") {
    return "Agency Owner";
  }

  if (role === "admin") {
    return "Admin";
  }

  return "Seeker";
}

function extractApiDetail(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
    ? error.detail
    : null;
}

export function AdminUsersClient() {
  const gate = useAdminRoleGate();
  const usersQuery = useAdminUsers();
  const updateUserRole = useUpdateAdminUserRole();
  const assignAgentAgency = useAssignAgentAgency();
  const deactivateUser = useDeactivateAdminUser();
  const activateUser = useActivateAdminUser();
  const [agencyAssignmentUserId, setAgencyAssignmentUserId] = useState<number | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [deactivationReasons, setDeactivationReasons] = useState<Record<number, string>>({});
  const [roleChangeReasons, setRoleChangeReasons] = useState<Record<number, string>>({});
  const promotedAgentProfileQuery = useAgentProfileForAdmin(agencyAssignmentUserId);
  const agenciesQuery = useAgencies(agencyAssignmentUserId !== null);

  useEffect(() => {
    if (promotedAgentProfileQuery.data?.agency_id) {
      const timeout = window.setTimeout(() => {
        setAgencyAssignmentUserId(null);
        setSelectedAgencyId(null);
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [promotedAgentProfileQuery.data?.agency_id]);

  if (gate.isChecking) {
    return <LoadingState fullPage message="Checking admin access..." />;
  }

  if (!gate.isAllowed) {
    return null;
  }

  if (usersQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <UsersHeader />
        <UsersListSkeleton />
      </div>
    );
  }

  if (usersQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <UsersHeader />
        <ErrorState
          title="Could not load users"
          message="There was a problem loading the admin user directory. Please try again."
          onRetry={() => {
            void usersQuery.refetch();
          }}
        />
      </div>
    );
  }

  if ((usersQuery.data ?? []).length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <UsersHeader />
        <EmptyState
          title="No users found"
          description="User accounts will appear here once people start signing up."
        />
      </div>
    );
  }

  const handleRoleUpdate = async (
    user: UserProfile,
    nextRole: "agent" | "seeker",
  ) => {
    const isDemotion =
      nextRole === "seeker" &&
      (user.user_role === "agent" || user.user_role === "agency_owner");
    const roleChangeReason = roleChangeReasons[user.user_id]?.trim();

    if (isDemotion && !roleChangeReason) {
      notify.error("Enter a reason before demoting this user.");
      return;
    }

    try {
      const updatedUser = await updateUserRole.mutateAsync({
        userId: user.user_id,
        userRole: nextRole,
        roleChangeReason,
      });

      if (nextRole === "agent") {
        setAgencyAssignmentUserId(updatedUser.user_id);
        setSelectedAgencyId(null);
        notify.success("User promoted to agent");
        return;
      }

      if (agencyAssignmentUserId === user.user_id) {
        setAgencyAssignmentUserId(null);
        setSelectedAgencyId(null);
      }

      notify.success("User demoted to seeker");
      setRoleChangeReasons((current) => {
        const next = { ...current };
        delete next[user.user_id];
        return next;
      });
    } catch (error) {
      notify.error(extractApiDetail(error) ?? "Could not update user role");
    }
  };

  const handleAssignAgency = async () => {
    if (!agencyAssignmentUserId || !selectedAgencyId) {
      notify.error("Select an agency before confirming");
      return;
    }

    try {
      await assignAgentAgency.mutateAsync({
        userId: agencyAssignmentUserId,
        agencyId: selectedAgencyId,
        agentProfile: promotedAgentProfileQuery.data ?? null,
      });
      notify.success("Agency assigned");
      setAgencyAssignmentUserId(null);
      setSelectedAgencyId(null);
    } catch (error) {
      notify.error(extractApiDetail(error) ?? "Could not assign agency");
    }
  };

  const handleDeactivateUser = async (user: UserProfile) => {
    const reason = deactivationReasons[user.user_id]?.trim();

    if (!reason) {
      notify.error("Enter a reason before deactivating this user.");
      return;
    }

    try {
      await deactivateUser.mutateAsync({
        userId: user.user_id,
        payload: { reason },
      });
      notify.success("User deactivated");
      setDeactivationReasons((current) => {
        const next = { ...current };
        delete next[user.user_id];
        return next;
      });
    } catch (error) {
      notify.error(extractApiDetail(error) ?? "Could not deactivate user");
    }
  };

  const handleActivateUser = async (user: UserProfile) => {
    try {
      await activateUser.mutateAsync(user.user_id);
      notify.success("User activated");
    } catch (error) {
      notify.error(extractApiDetail(error) ?? "Could not activate user");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <UsersHeader />

      <div className="space-y-4">
        {(usersQuery.data ?? []).map((user) => {
          const isRoleMutationPending =
            updateUserRole.isPending &&
            updateUserRole.variables?.userId === user.user_id;
          const isAgencyAssignmentRow = agencyAssignmentUserId === user.user_id;
          const isDeactivated = Boolean(user.deleted_at);

          return (
            <div
              key={user.user_id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
                    </h2>
                    <Badge variant={getRoleBadgeVariant(user.user_role)}>
                      {formatRoleLabel(user.user_role)}
                    </Badge>
                    <Badge variant={isDeactivated ? "danger" : "success"}>
                      {isDeactivated ? "Deactivated" : "Active"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  {user.deactivation_reason ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Deactivation reason: {user.deactivation_reason}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {user.user_role === "seeker" && !isDeactivated ? (
                    <Button
                      size="sm"
                      loading={isRoleMutationPending}
                      onClick={() => void handleRoleUpdate(user, "agent")}
                    >
                      Promote to Agent
                    </Button>
                  ) : null}
                  {user.user_role === "agent" && !isDeactivated ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={isRoleMutationPending}
                      onClick={() => void handleRoleUpdate(user, "seeker")}
                    >
                      Demote to Seeker
                    </Button>
                  ) : null}
                  {user.user_role === "agency_owner" && !isDeactivated ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={isRoleMutationPending}
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Demote this agency owner to seeker?",
                        );

                        if (confirmed) {
                          void handleRoleUpdate(user, "seeker");
                        }
                      }}
                    >
                      Demote to Seeker
                    </Button>
                  ) : null}
                  {isDeactivated ? (
                    <Button
                      size="sm"
                      loading={
                        activateUser.isPending &&
                        activateUser.variables === user.user_id
                      }
                      onClick={() => void handleActivateUser(user)}
                    >
                      Activate
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={
                        deactivateUser.isPending &&
                        deactivateUser.variables?.userId === user.user_id
                      }
                      onClick={() => void handleDeactivateUser(user)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>

              {!isDeactivated ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(user.user_role === "agent" || user.user_role === "agency_owner") ? (
                    <Input
                      label="Role change reason"
                      placeholder="Required before demoting this user"
                      value={roleChangeReasons[user.user_id] ?? ""}
                      onChange={(event) =>
                        setRoleChangeReasons((current) => ({
                          ...current,
                          [user.user_id]: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                  <Input
                    label="Deactivation reason"
                    placeholder="Required before deactivating this user"
                    value={deactivationReasons[user.user_id] ?? ""}
                    onChange={(event) =>
                      setDeactivationReasons((current) => ({
                        ...current,
                        [user.user_id]: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              {isAgencyAssignmentRow ? (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Assign an agency to this new agent
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Choose the agency they should belong to before they start managing listings.
                  </p>

                  {promotedAgentProfileQuery.isLoading ? (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      Checking agent profile...
                    </p>
                  ) : null}

                  {promotedAgentProfileQuery.isError ? (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      Could not prepare agency assignment for this user yet.
                    </p>
                  ) : null}

                  {!promotedAgentProfileQuery.isLoading &&
                  !promotedAgentProfileQuery.isError &&
                  !(promotedAgentProfileQuery.data?.agency_id) ? (
                    <div className="mt-4 space-y-3">
                      <label
                        htmlFor={`agency-assignment-${user.user_id}`}
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Agency
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                          id={`agency-assignment-${user.user_id}`}
                          value={selectedAgencyId ?? ""}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setSelectedAgencyId(Number.isNaN(value) || value <= 0 ? null : value);
                          }}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        >
                          <option value="">Select an agency</option>
                          {(agenciesQuery.data ?? []).map((agency) => (
                            <option key={agency.agency_id} value={agency.agency_id}>
                              {agency.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          loading={assignAgentAgency.isPending}
                          onClick={() => void handleAssignAgency()}
                        >
                          Confirm Agency
                        </Button>
                      </div>
                      {agenciesQuery.isLoading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Loading agencies...
                        </p>
                      ) : null}
                      {agenciesQuery.isError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Could not load agencies right now.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
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
          Promote seekers, demote agents, and keep role changes flowing through the backend sync path.
        </p>
      </div>
    </div>
  );
}
