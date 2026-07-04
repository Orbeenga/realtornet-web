"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Building2,
  CheckCircle2,
  Clock,
  Home,
  List,
  Users,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  FileText,
  Activity,
  Eye,
  BarChart,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
} from "@/components";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import {
  useAgencies,
  useAgencyMembershipHistory,
  useAgencyStats,
  useAgencyProfile,
  useUpdateAgencyProfile,
} from "@/features/agencies/hooks";
import {
  useAgencyApproveProperty,
  useAgencyQueue,
  useAgencyInventory,
  usePendingAdmin,
  useAgencyRejectProperty,
  useRecallPropertyFromAdminReview,
} from "@/features/properties/hooks";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isVerifiedAgency } from "@/features/agencies/lib/verification";
import { AgencyOwnerDashboardSkeleton } from "./AgencyOwnerDashboardSkeleton";
import { formatMembershipAction, formatMembershipDate } from "./membershipHistory";

const CLICKABLE_CARD_CLASS =
  "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50";

const agencyProfileSchema = z.object({
  name: z.string().trim().min(2, "Agency name is required"),
  description: z.string().trim().optional(),
  address: z.string().trim().optional(),
  website_url: z.union([z.url("Use a valid website URL"), z.literal("")]).optional(),
  logo_url: z.union([z.url("Use a valid logo URL"), z.literal("")]).optional(),
});

type AgencyProfileFormValues = z.infer<typeof agencyProfileSchema>;

type RejectDialogState = {
  propertyId: number;
  propertyTitle: string;
};

export function AgencyOwnerDashboardClient() {
  const gate = useAgentRoleGate();
  const { user } = useAuth();
  const [isEditingAgencyProfile, setIsEditingAgencyProfile] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const userAgencyId = user?.agency_id;
  const userEmail = user?.email;
  const shouldLoadAgencyDirectory = gate.isAllowed && typeof userAgencyId !== "number";
  const agencyProfileQuery = useAgencyProfile(userAgencyId ?? "");
  const agenciesQuery = useAgencies(shouldLoadAgencyDirectory);

  const agency = useMemo(() => {
    if (typeof userAgencyId === "number") {
      return agencyProfileQuery.data;
    }

    const email = userEmail?.toLowerCase();

    if (!email) {
      return undefined;
    }

    return (agenciesQuery.data ?? []).find(
      (candidate) => candidate.owner_email?.toLowerCase() === email,
    );
  }, [agenciesQuery.data, agencyProfileQuery.data, userAgencyId, userEmail]);

  const agencyId = agency?.agency_id;
  const statsQuery = useAgencyStats(agencyId ?? undefined, Boolean(agencyId), "include");
  const historyQuery = useAgencyMembershipHistory(agencyId ?? null, Boolean(agencyId));
  const agencyQueueQuery = useAgencyQueue(Boolean(agencyId));
  const pendingAdminQuery = usePendingAdmin(Boolean(agencyId));
  const agencyInventoryQuery = useAgencyInventory(Boolean(agencyId));
  const approveListing = useAgencyApproveProperty();
  const rejectListing = useAgencyRejectProperty();
  const recallListing = useRecallPropertyFromAdminReview();
  const updateAgencyProfile = useUpdateAgencyProfile(agencyId);
  const agencyProfileForm = useForm<AgencyProfileFormValues>({
    resolver: zodResolver(agencyProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      website_url: "",
      logo_url: "",
    },
  });

  const handleStartAgencyProfileEdit = () => {
    if (!agency) {
      return;
    }

    agencyProfileForm.reset({
      name: agency.name,
      description: agency.description ?? "",
      address: agency.address ?? "",
      website_url: agency.website_url ?? "",
      logo_url: agency.logo_url ?? "",
    });
    setIsEditingAgencyProfile(true);
  };

  const handleRejectListing = async () => {
    if (!rejectDialog) return;
    const reason = rejectReason.trim();
    if (!reason) {
      notify.error("Enter a reason before rejecting this listing.");
      return;
    }
    try {
      await rejectListing.mutateAsync({ propertyId: rejectDialog.propertyId, reason });
      notify.success("Listing rejected.");
      setRejectDialog(null);
      setRejectReason("");
    } catch {
      notify.error("Could not reject listing.");
    }
  };

  const handleRecallListing = async (propertyId: number) => {
    try {
      await recallListing.mutateAsync(propertyId);
      notify.success("Listing recalled from admin review.");
    } catch {
      notify.error("Could not recall listing.");
    }
  };

  const handleCancelAgencyProfileEdit = () => {
    setIsEditingAgencyProfile(false);
    agencyProfileForm.clearErrors();
  };

  const handleUpdateAgencyProfile = async (values: AgencyProfileFormValues) => {
    try {
      await updateAgencyProfile.mutateAsync({
        name: values.name,
        description: values.description?.trim() || null,
        address: values.address?.trim() || null,
        website_url: values.website_url?.trim() || null,
        logo_url: values.logo_url?.trim() || null,
      });
      notify.success("Agency profile updated");
      setIsEditingAgencyProfile(false);
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not update agency profile.";
      agencyProfileForm.setError("root", {
        type: "server",
        message,
      });
    }
  };

  const isAgencyLoading =
    typeof userAgencyId === "number"
      ? agencyProfileQuery.isLoading
      : agenciesQuery.isLoading;
  const isAgencyError =
    typeof userAgencyId === "number"
      ? agencyProfileQuery.isError
      : agenciesQuery.isError;

  if (gate.isChecking || !gate.isAllowed || isAgencyLoading) {
    return <AgencyOwnerDashboardSkeleton />;
  }

  if (isAgencyError) {
    return (
      <ErrorState
        title="Could not load agency dashboard"
        message="There was a problem loading your agency profile."
        onRetry={() => {
          if (typeof userAgencyId === "number") {
            void agencyProfileQuery.refetch();
            return;
          }

          void agenciesQuery.refetch();
        }}
      />
    );
  }

  if (!agency) {
    return (
      <EmptyState
        title="No agency profile found"
        description="Your agency owner account is active, but no approved agency profile was matched to your email."
      />
    );
  }

  const statsData = statsQuery.data;
  const statsListingCount = agency.property_count;
  const statsAgentCount = agency.agent_count;

  return (
    <div className="mx-auto max-w-[1440px] space-y-10 px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Agency dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {agency.name}
          </h1>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {agency.name}
              </span>
              <Badge>{agency.status}</Badge>
              {isVerifiedAgency(agency) ? <Badge>Verified</Badge> : null}
            </div>
            {agency.description ? (
              <p className="max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                {agency.description}
              </p>
            ) : null}
            {agency.status_reason ? (
              <p className="max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {agency.status_reason}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/agencies/${agency.agency_id}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              View profile <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Button type="button" variant="secondary" size="sm" onClick={handleStartAgencyProfileEdit}>
              Edit profile
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-5 border-t border-gray-100 pt-5 text-sm md:grid-cols-3 dark:border-gray-800">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Contact</p>
            <p className="text-gray-900 dark:text-white">{agency.email ?? "Email unavailable"}</p>
            <p className="text-gray-500">{agency.phone_number ?? "Phone unavailable"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Owner</p>
            <p className="text-gray-900 dark:text-white">{agency.owner_name ?? user?.first_name ?? "Owner"}</p>
            <p className="text-gray-500">{agency.owner_email ?? user?.email ?? "Email unavailable"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Address</p>
            <p className="text-gray-900 dark:text-white">{agency.address ?? "Address unavailable"}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/account/listings"
            className={`flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${CLICKABLE_CARD_CLASS}`}
            aria-label="Open Live listings drilldown"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statsListingCount}</p>
              <p className="text-sm font-medium text-gray-500">Live listings</p>
            </div>
          </Link>
          <Link
            href="/account/agency/members"
            className={`flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${CLICKABLE_CARD_CLASS}`}
            aria-label="Open Roster agents drilldown"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statsAgentCount}</p>
              <p className="text-sm font-medium text-gray-500">Roster agents</p>
            </div>
          </Link>
          {statsData?.property_count !== undefined ? (
            <Link
              href="/account/listings"
              className={`flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${CLICKABLE_CARD_CLASS}`}
              aria-label="Open Total properties drilldown"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statsData.property_count}</p>
                <p className="text-sm font-medium text-gray-500">Total properties</p>
              </div>
            </Link>
          ) : null}
          <div
            className={`flex h-[120px] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${CLICKABLE_CARD_CLASS}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              const agencyQueueSection = document.getElementById("agency-queue");
              if (agencyQueueSection) {
                agencyQueueSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const agencyQueueSection = document.getElementById("agency-queue");
                if (agencyQueueSection) {
                  agencyQueueSection.scrollIntoView({ behavior: "smooth" });
                }
              }
            }}
            aria-label="Scroll to Agency Queue section"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
              <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {statsData?.listings_by_status
                  ? Object.entries(statsData.listings_by_status)
                      .filter(([s]) => s !== "live")
                      .reduce((sum, [, c]) => sum + c, 0)
                  : 0}
              </p>
              <p className="text-sm font-medium text-gray-500">Pending actions</p>
            </div>
          </div>
        </div>
      </section>

      {statsData?.listings_by_status ? (
        <section>
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Listings by status
          </h2>
          {Object.entries(statsData.listings_by_status)
            .filter(([s]) => s !== "live")
            .sort(([a], [b]) => a.localeCompare(b)).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(statsData.listings_by_status)
                .filter(([s]) => s !== "live")
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([status, count]) => {
                  const statusMeta = {
                    draft: { icon: FileText, color: "text-gray-500 bg-gray-100 dark:bg-gray-800", label: "Draft — not yet submitted for agency review" },
                    agency_review: { icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40", label: "Awaiting your decision" },
                    agency_rejected: { icon: XCircle, color: "text-red-600 bg-red-50 dark:bg-red-950/40", label: "Rejected at agency level" },
                    admin_review: { icon: Eye, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40", label: "Awaiting admin decision" },
                    admin_rejected: { icon: AlertCircle, color: "text-red-600 bg-red-50 dark:bg-red-950/40", label: "Rejected by admin" },
                    revoked: { icon: XCircle, color: "text-red-600 bg-red-50 dark:bg-red-950/40", label: "Revoked from live" },
                  }[status] ?? { icon: List, color: "text-gray-500 bg-gray-100 dark:bg-gray-800", label: status.replace(/_/g, " ") };
                  const Icon = statusMeta.icon;
                  return (
                    <Link
                      key={status}
                      href={`/account/listings?status=${encodeURIComponent(status)}`}
                      className={`flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${CLICKABLE_CARD_CLASS}`}
                      aria-label={`Open ${status.replace(/_/g, " ")} listings drilldown`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${statusMeta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {status.replace(/_/g, " ")}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">{statusMeta.label}</p>
                      </div>
                    </Link>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">All listings are live</p>
              <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
                                This section breaks down your agency&apos;s properties by moderation status &mdash; draft,
                awaiting agency review, rejected, awaiting admin review, or revoked.
                These cards populate automatically when listings enter non-live statuses.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section>
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Listings by status
          </h2>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <BarChart className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Breakdown data loading</p>
            <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
               Once loaded, each card here counts your agency&apos;s properties in a given moderation
               status &mdash; draft, agency review, admin review, rejected, or revoked &mdash; so you can
               track pipeline health at a glance.
            </p>
          </div>
        </section>
      )}

      <section id="agency-queue">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agency Queue</h2>
          {agencyQueueQuery.data && agencyQueueQuery.data.length > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2.5 text-xs font-bold text-white">
              {agencyQueueQuery.data.length}
            </span>
          ) : null}
        </div>
        {agencyQueueQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-900">
            <Clock className="h-5 w-5 animate-pulse text-gray-300" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : agencyQueueQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            Could not load agency queue.
          </div>
        ) : !agencyQueueQuery.data || agencyQueueQuery.data.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <CheckCircle2 className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No listings awaiting your review.</p>
            <p className="text-xs text-gray-400">New submissions from your agents will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {agencyQueueQuery.data.map((listing, index) => (
                <div
                  key={listing.property_id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/80 dark:bg-gray-900/60"}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-gray-900 dark:text-white">{listing.title}</p>
                      <Badge>Agency review</Badge>
                    </div>
                    {listing.owner_display_name ? (
                      <p className="text-sm text-gray-500">Agent: {listing.owner_display_name}</p>
                    ) : null}
                    <p className="text-xs text-gray-400">
                      Submitted {listing.created_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(listing.created_at)) : "Unknown"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button" size="sm"
                      loading={approveListing.isPending && approveListing.variables === listing.property_id}
                      onClick={() => { void approveListing.mutateAsync(listing.property_id); }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button" size="sm" variant="destructive"
                      onClick={() => { setRejectDialog({ propertyId: listing.property_id, propertyTitle: listing.title }); setRejectReason(""); }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pending Admin
          </h2>
          {pendingAdminQuery.data && pendingAdminQuery.data.length > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-600 px-2.5 text-xs font-bold text-white">
              {pendingAdminQuery.data.length}
            </span>
          ) : null}
        </div>
        {pendingAdminQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-900">
            <Clock className="h-5 w-5 animate-pulse text-gray-300" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : pendingAdminQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            Could not load pending admin listings.
          </div>
        ) : !pendingAdminQuery.data || pendingAdminQuery.data.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <CheckCircle2 className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No listings awaiting admin review.</p>
            <p className="text-xs text-gray-400">Listings you approve will automatically enter admin review.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pendingAdminQuery.data.map((listing, index) => (
                <div
                  key={listing.property_id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/80 dark:bg-gray-900/60"}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-gray-900 dark:text-white">{listing.title}</p>
                      <Badge>Admin review</Badge>
                    </div>
                    {listing.owner_display_name ? (
                      <p className="text-sm text-gray-500">Agent: {listing.owner_display_name}</p>
                    ) : null}
                    <p className="text-xs text-gray-400">Approved for admin review</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button" size="sm" variant="secondary"
                      loading={recallListing.isPending && recallListing.variables === listing.property_id}
                      onClick={() => void handleRecallListing(listing.property_id)}
                    >
                      Recall
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Agency Inventory
          </h2>
          {agencyInventoryQuery.data && agencyInventoryQuery.data.length > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-200 px-2.5 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {agencyInventoryQuery.data.length}
            </span>
          ) : null}
        </div>
        {agencyInventoryQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-900">
            <Clock className="h-5 w-5 animate-pulse text-gray-300" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : agencyInventoryQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            Could not load agency inventory.
          </div>
        ) : !agencyInventoryQuery.data || agencyInventoryQuery.data.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <Home className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No live listings for this agency.</p>
            <p className="text-xs text-gray-400">Approved listings will appear here once they go live.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400">
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {agencyInventoryQuery.data.map((listing) => (
                  <tr key={listing.property_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/properties/${listing.property_id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {listing.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {listing.owner_display_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Live</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/properties/${listing.property_id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">Membership history</h2>
        {historyQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-900">
            <Clock className="h-5 w-5 animate-pulse text-gray-300" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : historyQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            Could not load membership history.
          </div>
        ) : !historyQuery.data || historyQuery.data.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <Users className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No membership history recorded for this agency.</p>
            <p className="text-xs text-gray-400">Agent joins, role changes, and departures will appear here.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 h-full w-px bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-0">
              {[...historyQuery.data]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((entry) => {
                  const dotColor =
                    entry.action === "joined" || entry.action === "reinstated"
                      ? "bg-emerald-500"
                      : entry.action === "revoked" || entry.action === "suspended"
                        ? "bg-red-500"
                        : entry.action === "left"
                          ? "bg-amber-500"
                          : "bg-gray-400";
                  const sourceLabel =
                    entry.source_type === "audit_event" ? "Agency Action"
                    : entry.source_type === "join_request" ? "Application"
                    : entry.source_type === "review_request" ? "Review Request"
                    : entry.source_type;
                  const badgeVariant: "success" | "danger" | "warning" | "outline" =
                    entry.action === "joined" || entry.action === "reinstated"
                      ? "success"
                      : entry.action === "revoked" || entry.action === "suspended"
                        ? "danger"
                        : entry.action === "left"
                          ? "warning"
                          : "outline";
                  return (
                    <div key={entry.id ?? entry.timestamp} className="relative flex gap-5 pb-8 pl-5 last:pb-0">
                      <div className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-white dark:ring-gray-950 ${dotColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.user_display_name ?? "Unknown"}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">{sourceLabel}</Badge>
                            {entry.action ? (
                              <Badge variant={badgeVariant}>{formatMembershipAction(entry.action)}</Badge>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{formatMembershipDate(entry.timestamp)}</p>
                        {entry.reason ? (
                          <p className="mt-1.5 text-sm leading-5 text-gray-600 dark:text-gray-400">{entry.reason}</p>
                        ) : null}
                        {entry.cover_note ? (
                          <div className="mt-2 rounded-lg bg-blue-50 p-2 text-xs leading-5 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                            <p className="mb-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">Original application</p>
                            <p className="whitespace-pre-wrap">{entry.cover_note}</p>
                          </div>
                        ) : null}
                        {entry.prior_role || entry.post_role ? (
                          <p className="mt-1 text-xs text-gray-400">
                            {entry.prior_role ?? "—"} &rarr; {entry.post_role ?? "—"}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(rejectDialog)}
        onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectReason(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject listing</DialogTitle>
            <DialogDescription>
              {rejectDialog ? `Provide a reason for rejecting "${rejectDialog.propertyTitle}".` : ""}
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Rejection reason"
            placeholder="Required reason shown to the listing agent"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" />}>Cancel</DialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={rejectListing.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => void handleRejectListing()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isEditingAgencyProfile} onOpenChange={setIsEditingAgencyProfile}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit agency profile</SheetTitle>
            <SheetDescription>
              Update public agency fields visible on your agency page.
            </SheetDescription>
          </SheetHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => void agencyProfileForm.handleSubmit(handleUpdateAgencyProfile)(event)}
          >
            <div className="grid gap-4">
              <Input label="Agency name" error={agencyProfileForm.formState.errors.name?.message} {...agencyProfileForm.register("name")} />
              <Input label="Website URL" placeholder="https://example.com" error={agencyProfileForm.formState.errors.website_url?.message} {...agencyProfileForm.register("website_url")} />
              <Input label="Logo URL" placeholder="https://example.com/logo.png" error={agencyProfileForm.formState.errors.logo_url?.message} {...agencyProfileForm.register("logo_url")} />
              <Input label="Address" error={agencyProfileForm.formState.errors.address?.message} {...agencyProfileForm.register("address")} />
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
              <textarea
                rows={4}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                {...agencyProfileForm.register("description")}
              />
            </label>
            {agencyProfileForm.formState.errors.root?.message ? (
              <p className="text-sm text-red-600" role="alert">{agencyProfileForm.formState.errors.root.message}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={updateAgencyProfile.isPending}>Save profile</Button>
              <Button type="button" variant="secondary" onClick={handleCancelAgencyProfileEdit}>Cancel</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

    </div>
  );
}
