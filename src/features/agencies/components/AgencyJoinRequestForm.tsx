"use client";

import Link from "next/link";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, Card, CardBody, EmptyState, ErrorState, Input, LoadingState } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { normalizeAppRole } from "@/features/auth/navigation";
import {
  useAgencyProfile,
  useCreateAgencyJoinRequest,
  useMyAgencyJoinRequests,
} from "@/features/agencies/hooks";
import { ApiError } from "@/lib/api/client";
import { getStoredJwtRole } from "@/lib/jwt";
import { notify } from "@/lib/toast";

const joinRequestSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  email: z.email("Use a valid email address"),
  phone_number: z.string().trim().min(6, "Phone number is required"),
  cover_note: z.string().trim().min(10, "Add a short cover note"),
  portfolio_details: z.string().trim().optional().or(z.literal("")),
});

type JoinRequestFormValues = z.infer<typeof joinRequestSchema>;

interface AgencyJoinRequestFormProps {
  agencyId: string;
}

export function AgencyJoinRequestForm({ agencyId }: AgencyJoinRequestFormProps) {
  const { user, loading } = useAuth();
  const role = normalizeAppRole(getStoredJwtRole() ?? user?.user_role);
  const agencyQuery = useAgencyProfile(agencyId);
  const requestsQuery = useMyAgencyJoinRequests(
    Boolean(user) && (role === "seeker" || role === "agent"),
  );
  const createJoinRequest = useCreateAgencyJoinRequest(agencyId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitSuccessful },
  } = useForm<JoinRequestFormValues>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: {
      full_name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
      email: user?.email ?? "",
      phone_number: user?.phone_number ?? "",
      cover_note: "",
      portfolio_details: "",
    },
  });
  const watchedFullName = useWatch({ control, name: "full_name" });

  useEffect(() => {
    if (!user) {
      return;
    }

    reset((current) => ({
      ...current,
      full_name:
        current.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(" "),
      email: current.email || user.email,
      phone_number: current.phone_number || user.phone_number || "",
    }));
  }, [reset, user]);

  const onSubmit = async (values: JoinRequestFormValues) => {
    try {
      const profileDetails = [
        `Full name: ${values.full_name.trim()}`,
        `Email: ${values.email.trim()}`,
        `Phone: ${values.phone_number.trim()}`,
        values.portfolio_details?.trim()
          ? `Portfolio / background: ${values.portfolio_details.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      await createJoinRequest.mutateAsync({
        cover_note: values.cover_note.trim(),
        portfolio_details: profileDetails,
      });
      notify.success("Join request submitted");
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not submit your join request. Please try again.";
      setError("root", {
        type: "server",
        message,
      });
    }
  };

  if (loading || agencyQuery.isLoading || requestsQuery.isLoading) {
    return <LoadingState />;
  }

  if (!user || !role) {
    return (
      <Card>
        <CardBody className="space-y-4 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sign in to request access
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Agent join requests are available to signed-in seekers and agents.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign in
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (role !== "seeker" && role !== "agent") {
    return (
      <EmptyState
        title="Join requests are for seekers and agents"
        description="Use a seeker or agent account to request to join an agency."
      />
    );
  }

  if (agencyQuery.isError || !agencyQuery.data) {
    return (
      <ErrorState
        title="Could not load agency"
        message="There was a problem loading this agency before submitting your request."
        onRetry={() => {
          void agencyQuery.refetch();
        }}
      />
    );
  }

  const existingRequest = requestsQuery.data
    ?.filter((request) => String(request.agency_id) === agencyId)
    .find((request) => request.status === "approved" || request.status === "pending");

  if (existingRequest?.status === "approved") {
    return (
      <Card>
        <CardBody className="space-y-5 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            You have already joined this agency
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            {agencyQuery.data.name} is already listed in My Agencies, so a new join
            request is not needed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/account/join-requests"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              View My Agencies
            </Link>
            <Link
              href={`/agencies/${agencyId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Back to agency
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (existingRequest?.status === "pending") {
    return (
      <Card>
        <CardBody className="space-y-5 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Your request is pending
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            {agencyQuery.data.name} already has your join request. Track the
            status from My Agencies instead of submitting another request.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/account/join-requests"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              View My Agencies
            </Link>
            <Link
              href={`/agencies/${agencyId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Back to agency
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (isSubmitSuccessful) {
    return (
      <Card>
        <CardBody className="space-y-5 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Request submitted
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Your request to join {agencyQuery.data.name} has been sent for review.
            You can track it from My Agencies.
          </p>
          <Link
            href="/account/join-requests"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            View My Agencies
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-6 p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            {agencyQuery.data.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Request to Join as Agent
          </h1>
        </div>

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Full name"
              placeholder="Your full name"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone number"
              placeholder="+234..."
              error={errors.phone_number?.message}
              {...register("phone_number")}
            />
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
              <p className="font-medium text-gray-900 dark:text-white">
                Request summary
              </p>
              <p className="mt-1">
                {watchedFullName || "Your name"} will be sent to this agency
                with your contact details.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="cover-note" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cover note
            </label>
            <textarea
              id="cover-note"
              rows={6}
              className="min-h-36 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Tell the agency why you want to join their roster."
              {...register("cover_note")}
            />
            {errors.cover_note?.message ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.cover_note.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="portfolio-details" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Portfolio / background
            </label>
            <textarea
              id="portfolio-details"
              rows={5}
              className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Share your experience, coverage areas, specialties, or links the agency should review."
              {...register("portfolio_details")}
            />
            {errors.portfolio_details?.message ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.portfolio_details.message}
              </p>
            ) : null}
          </div>

          {errors.root?.message ? (
            <p className="text-sm text-red-600" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={createJoinRequest.isPending}>
              Submit request
            </Button>
            <Link
              href={`/agencies/${agencyId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Cancel
            </Link>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
