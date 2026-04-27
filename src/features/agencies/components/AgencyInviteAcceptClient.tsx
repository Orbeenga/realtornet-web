"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody, ErrorState, LoadingState } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { useAcceptAgencyInvite } from "@/features/agencies/hooks";
import { ApiError } from "@/lib/api/client";

export function AgencyInviteAcceptClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading } = useAuth();
  const acceptInvite = useAcceptAgencyInvite();
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || !token || hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;
    void acceptInvite.mutateAsync({ invite_token: token });
  }, [acceptInvite, loading, token, user]);

  if (!token) {
    return (
      <ErrorState
        title="Invite link is missing"
        message="The invite link does not include a token. Ask the agency owner for a fresh invite."
      />
    );
  }

  if (loading) {
    return <LoadingState message="Checking your session..." />;
  }

  if (!user) {
    return (
      <Card>
        <CardBody className="space-y-5 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sign in to accept invite
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Use the account that should join this agency roster.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/agencies/accept-invite?token=${token}`)}`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign in
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (acceptInvite.isPending || acceptInvite.isIdle) {
    return <LoadingState message="Accepting agency invite..." />;
  }

  if (acceptInvite.isError) {
    return (
      <ErrorState
        title="Could not accept invite"
        message={
          acceptInvite.error instanceof ApiError &&
          typeof acceptInvite.error.detail === "string"
            ? acceptInvite.error.detail
            : "There was a problem accepting this invite."
        }
        onRetry={() => {
          hasSubmittedRef.current = false;
          void acceptInvite.mutateAsync({ invite_token: token });
        }}
      />
    );
  }

  const redirectUrl = acceptInvite.data?.redirect_url ?? "/account/listings";

  return (
    <Card>
      <CardBody className="space-y-5 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Invite accepted
        </h1>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          Your account has been connected to the agency.
        </p>
        <Button type="button" onClick={() => window.location.assign(redirectUrl)}>
          Continue
        </Button>
      </CardBody>
    </Card>
  );
}
