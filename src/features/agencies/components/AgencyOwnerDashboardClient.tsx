"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  CardBody,
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
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Agency dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {agency.name}
        </h1>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Agency profile</h2>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                {agency.name}
              </span>
              <Badge>{agency.status}</Badge>
              {isVerifiedAgency(agency) ? <Badge>Verified</Badge> : null}
            </div>
            {agency.description ? (
              <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                {agency.description}
              </p>
            ) : null}
            {agency.status_reason ? (
              <p className="max-w-3xl rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Latest agency decision: {agency.status_reason}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/agencies/${agency.agency_id}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              View profile
            </Link>
            <Button type="button" variant="secondary" onClick={handleStartAgencyProfileEdit}>
              Edit profile
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Contact</p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">{agency.email ?? "Email unavailable"}</p>
            <p className="text-gray-500 dark:text-gray-400">{agency.phone_number ?? "Phone unavailable"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Owner</p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">{agency.owner_name ?? user?.first_name ?? "Owner"}</p>
            <p className="text-gray-500 dark:text-gray-400">{agency.owner_email ?? user?.email ?? "Email unavailable"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">{agency.address ?? "Address unavailable"}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Stats</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Live listings</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{statsListingCount}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Roster agents</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{statsAgentCount}</p>
          </div>
        </div>
      </section>

      {statsData?.listings_by_status ? (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(statsData.listings_by_status)
              .filter(([s]) => s !== "live")
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([status, count]) => (
                <div key={status} className="rounded-lg border border-border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {status.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{count}</p>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agency Queue</h2>
          {agencyQueueQuery.data && agencyQueueQuery.data.length > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
              {agencyQueueQuery.data.length}
            </span>
          ) : null}
        </div>
        {agencyQueueQuery.isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : agencyQueueQuery.isError ? (
          <p className="text-sm text-red-500">Could not load agency queue.</p>
        ) : !agencyQueueQuery.data || agencyQueueQuery.data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No listings awaiting your review.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agencyQueueQuery.data.map((listing) => (
              <Card key={listing.property_id}>
                <CardBody className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{listing.title}</p>
                    <Badge>Agency review</Badge>
                  </div>
                  {listing.owner_display_name ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Agent: {listing.owner_display_name}</p>
                  ) : null}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Submitted {listing.created_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(listing.created_at)) : "Unknown"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
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
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Pending Admin
          {pendingAdminQuery.data && pendingAdminQuery.data.length > 0 ? ` (${pendingAdminQuery.data.length})` : null}
        </h2>
        {pendingAdminQuery.isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : pendingAdminQuery.isError ? (
          <p className="text-sm text-red-500">Could not load pending admin listings.</p>
        ) : !pendingAdminQuery.data || pendingAdminQuery.data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No listings awaiting admin review.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pendingAdminQuery.data.map((listing) => (
              <Card key={listing.property_id}>
                <CardBody className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{listing.title}</p>
                    <Badge>Admin review</Badge>
                  </div>
                  {listing.owner_display_name ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Agent: {listing.owner_display_name}</p>
                  ) : null}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Approved for admin review
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button" size="sm" variant="secondary"
                      loading={recallListing.isPending && recallListing.variables === listing.property_id}
                      onClick={() => void handleRecallListing(listing.property_id)}
                    >
                      Recall
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Agency Inventory
          {agencyInventoryQuery.data && agencyInventoryQuery.data.length > 0 ? ` (${agencyInventoryQuery.data.length})` : null}
        </h2>
        {agencyInventoryQuery.isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : agencyInventoryQuery.isError ? (
          <p className="text-sm text-red-500">Could not load agency inventory.</p>
        ) : !agencyInventoryQuery.data || agencyInventoryQuery.data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No live listings for this agency.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agencyInventoryQuery.data.map((listing) => (
              <Card key={listing.property_id}>
                <CardBody className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      href={`/properties/${listing.property_id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                    >
                      {listing.title}
                    </Link>
                    <Badge variant="success">Live</Badge>
                  </div>
                  {listing.owner_display_name ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Agent: {listing.owner_display_name}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href={`/properties/${listing.property_id}`}
                      className="inline-flex h-7 items-center justify-center rounded-lg bg-secondary px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                    >
                      View listing
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Membership history</h2>
        {historyQuery.isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : historyQuery.isError ? (
          <p className="text-sm text-red-500">Could not load membership history.</p>
        ) : !historyQuery.data || historyQuery.data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No membership history recorded for this agency.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...historyQuery.data]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((record) => (
                <Card key={record.id}>
                  <CardBody className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{record.user_display_name}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {formatMembershipDate(record.created_at)}
                        </p>
                      </div>
                      <Badge variant={
                        record.action === "joined" || record.action === "reinstated"
                          ? "success"
                          : record.action === "revoked" || record.action === "suspended"
                            ? "danger"
                            : record.action === "left"
                              ? "warning"
                              : "outline"
                      }>
                        {formatMembershipAction(record.action)}
                      </Badge>
                    </div>
                    {record.reason ? (
                      <p className="text-sm leading-5 text-gray-600 dark:text-gray-300">{record.reason}</p>
                    ) : null}
                    {record.prior_role || record.post_role ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Role: {record.prior_role ?? "not recorded"} &rarr; {record.post_role ?? "not recorded"}
                      </p>
                    ) : null}
                  </CardBody>
                </Card>
              ))}
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
