import { Suspense } from "react";
import { LoadingState } from "@/components";
import { AgencyInviteAcceptClient } from "@/features/agencies/components";

export default function AgencyInviteAcceptPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<LoadingState message="Loading invite..." />}>
        <AgencyInviteAcceptClient />
      </Suspense>
    </div>
  );
}
