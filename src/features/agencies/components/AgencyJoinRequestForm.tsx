"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { normalizeAppRole } from "@/features/auth/navigation";
import {
  useAgencyProfile,
  useCreateAgencyJoinRequest,
} from "@/features/agencies/hooks";
import { getStoredJwtRole } from "@/lib/jwt";
import { notify } from "@/lib/toast";

const joinRequestSchema = z.object({
  cover_note: z.string().trim().min(10, "Add a short cover note"),
});

type JoinRequestFormValues = z.infer<typeof joinRequestSchema>;

interface AgencyJoinRequestFormProps {
  agencyId: string;
}

export function AgencyJoinRequestForm({ agencyId }: AgencyJoinRequestFormProps) {
  const { user, loading } = useAuth();
  const role = normalizeAppRole(getStoredJwtRole() ?? user?.user_role);
  const agencyQuery = useAgencyProfile(agencyId);
  const createJoinRequest = useCreateAgencyJoinRequest(agencyId);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitSuccessful },
  } = useForm<JoinRequestFormValues>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: {
      cover_note: "",
    },
  });

  const onSubmit = async (values: JoinRequestFormValues) => {
    try {
      await createJoinRequest.mutateAsync({
        cover_note: values.cover_note.trim(),
      });
      notify.success("Join request submitted");
    } catch {
      setError("root", {
        type: "server",
        message: "Could not submit your join request. Please try again.",
      });
    }
  };

  if (loading || agencyQuery.isLoading) {
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
            Agent join requests are available to signed-in seekers.
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

  if (role !== "seeker") {
    return (
      <EmptyState
        title="Join requests are for seekers"
        description="Use a seeker account to request to join an agency as an agent."
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

  if (isSubmitSuccessful) {
    return (
      <Card>
        <CardBody className="space-y-5 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Request submitted
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Your request to join {agencyQuery.data.name} has been sent for review.
          </p>
          <Link
            href={`/agencies/${agencyId}`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Back to Agency
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
