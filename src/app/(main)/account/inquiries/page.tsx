"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { getInquiryNavigationConfig } from "@/features/auth/navigation";
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
  const inquiryConfig = getInquiryNavigationConfig(user?.user_role);

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
          source="received"
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
