"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  getInquiryNavigationConfig,
  normalizeAppRole,
} from "@/features/auth/navigation";
import { useAgencies } from "@/features/agencies/hooks";
import { getStoredJwtRole } from "@/lib/jwt";
import {
  ReceivedInquiriesList,
  SentInquiriesList,
} from "@/features/inquiries/components";

function PageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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
        Back to listings
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

export default function InquiriesPage() {
  const { user } = useAuth();
  const normalizedRole = normalizeAppRole(getStoredJwtRole() ?? user?.user_role);
  const inquiryConfig = getInquiryNavigationConfig(normalizedRole);
  const shouldResolveAgency =
    normalizedRole === "agency_owner" && typeof user?.agency_id !== "number";
  const agenciesQuery = useAgencies(shouldResolveAgency);
  const agencyId = useMemo(() => {
    if (typeof user?.agency_id === "number") {
      return user.agency_id;
    }

    const email = user?.email?.toLowerCase();

    if (!email) {
      return undefined;
    }

    return (agenciesQuery.data ?? []).find(
      (agency) => agency.owner_email?.toLowerCase() === email,
    )?.agency_id;
  }, [agenciesQuery.data, user?.agency_id, user?.email]);

  const pageCopy = useMemo(() => {
    if (inquiryConfig.mode === "sent") {
      return {
        title: "My inquiries",
        description: "Review the leads you've sent on listings and reopen the property any time.",
      };
    }

    if (inquiryConfig.mode === "admin") {
      return {
        title: "All inquiries",
        description: "Review inquiry activity across the platform.",
      };
    }

    return {
      title: "Inquiries",
      description:
        "Review inbound leads on your listings and follow up with seekers directly.",
    };
  }, [inquiryConfig.mode]);

  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      <PageIntro title={pageCopy.title} description={pageCopy.description} />

      {inquiryConfig.mode === "sent" ? <SentInquiriesList /> : null}

      {inquiryConfig.mode === "received" ? (
        <ReceivedInquiriesList
          source={normalizedRole === "agency_owner" ? "agency" : "received"}
          agencyId={agencyId}
          emptyTitle="No inquiries on your listings yet"
          emptyDescription="When seekers contact you about your listings, the lead details will appear here."
        />
      ) : null}

      {inquiryConfig.mode === "admin" ? (
        <ReceivedInquiriesList
          source="admin"
          emptyTitle="No inquiries found"
          emptyDescription="Inbound inquiries across the platform will appear here."
        />
      ) : null}
    </div>
  );
}
